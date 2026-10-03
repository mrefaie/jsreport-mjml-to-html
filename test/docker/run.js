// Integration test: installs the packed plugin into the official jsreport docker image
// and renders through the real HTTP API.
// usage: npm run test:docker  (JSREPORT_VERSION=4.x.x to test another jsreport version)
const { execFileSync } = require('child_process')
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.join(__dirname, '../..')
const jsreportVersion = process.env.JSREPORT_VERSION || '4.14.2'
const image = `jsreport-mjml-to-html-test:${jsreportVersion}`

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts })?.trim()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mjmlDoc = (body) => `<mjml><mj-head><mj-title>Docker</mj-title></mj-head><mj-body><mj-section><mj-column>${body}</mj-column></mj-section></mj-body></mjml>`

async function waitForServer (baseUrl, containerId) {
  const deadline = Date.now() + 180000

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/ping`)
      if (res.ok) return
    } catch (e) {}

    if (run('docker', ['inspect', '-f', '{{.State.Running}}', containerId]) !== 'true') {
      throw new Error('jsreport container exited during startup')
    }

    await sleep(1000)
  }

  throw new Error('jsreport did not start in time')
}

async function renderReport (baseUrl, template, data) {
  return fetch(`${baseUrl}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template, data })
  })
}

const tests = {
  'lists mjml-to-html in /api/recipe': async (baseUrl) => {
    const recipes = await (await fetch(`${baseUrl}/api/recipe`)).json()
    assert.ok(recipes.includes('mjml-to-html'), `recipes: ${recipes.join(', ')}`)
  },

  'renders mjml with handlebars data to html': async (baseUrl) => {
    const res = await renderReport(baseUrl, {
      content: mjmlDoc('{{#each items}}<mj-text>Item {{this}}</mj-text>{{/each}}'),
      recipe: 'mjml-to-html',
      engine: 'handlebars'
    }, { items: ['One', 'Two'] })

    const html = await res.text()
    assert.strictEqual(res.status, 200, html)
    assert.match(res.headers.get('content-type'), /^text\/html/)
    assert.match(html, /^<!doctype html>/)
    assert.match(html, /<title>Docker<\/title>/)
    assert.match(html, /Item One/)
    assert.match(html, /Item Two/)
    assert.doesNotMatch(html, /<mj-/)
  },

  'renders a stored template through the odata api': async (baseUrl) => {
    const name = `mjml-docker-${Date.now()}`
    const insert = await fetch(`${baseUrl}/odata/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content: mjmlDoc('<mj-text>Hello {{name}}</mj-text>'), recipe: 'mjml-to-html', engine: 'handlebars' })
    })
    assert.strictEqual(insert.status, 201, await insert.text())

    const res = await renderReport(baseUrl, { name }, { name: 'stored template' })
    const html = await res.text()
    assert.strictEqual(res.status, 200, html)
    assert.match(html, /Hello stored template/)
  },

  'returns an error for invalid mjml': async (baseUrl) => {
    const res = await renderReport(baseUrl, { content: 'not mjml', recipe: 'mjml-to-html', engine: 'none' })
    const body = await res.text()
    assert.ok(res.status >= 400, `expected error status, got ${res.status}`)
    assert.match(body, /Parsing failed/)
  },

  'serves the studio extension bundle': async (baseUrl, containerId) => {
    // studio inlines every extension's studio/main.js into this chunk, which is loaded lazily by the client
    const chunk = run('docker', ['exec', containerId, 'sh', '-c', 'ls node_modules/@jsreport/jsreport-studio/static/dist'])
      .split('\n')
      .find((f) => /^studio-extensions\.client\.[^.]+\.js$/.test(f))
    assert.ok(chunk, 'studio extensions chunk not found in the image')

    const res = await fetch(`${baseUrl}/studio/assets/${chunk}`)
    assert.strictEqual(res.status, 200)
    const js = await res.text()
    const studioMain = fs.readFileSync(path.join(root, 'studio/main.js'), 'utf8')
    assert.ok(js.includes(studioMain), 'studio/main.js of the plugin is not included in the studio extensions chunk')
  }
}

async function main () {
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsreport-mjml-to-html-'))
  let containerId

  try {
    console.log('building studio bundle and packing plugin...')
    run('npm', ['run', 'build'], { stdio: 'ignore' })
    const tarball = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', buildDir]))[0].filename
    fs.renameSync(path.join(buildDir, path.basename(tarball)), path.join(buildDir, 'jsreport-mjml-to-html.tgz'))
    fs.copyFileSync(path.join(__dirname, 'Dockerfile'), path.join(buildDir, 'Dockerfile'))

    console.log(`building docker image on jsreport/jsreport:${jsreportVersion}...`)
    run('docker', ['build', '-q', '--build-arg', `JSREPORT_VERSION=${jsreportVersion}`, '-t', image, buildDir])

    containerId = run('docker', ['run', '-d', '-p', '127.0.0.1::5488', image])
    const port = run('docker', ['port', containerId, '5488']).split('\n')[0].split(':').pop()
    const baseUrl = `http://127.0.0.1:${port}`

    console.log(`waiting for jsreport at ${baseUrl}...`)
    await waitForServer(baseUrl, containerId)

    let failed = 0
    for (const [name, test] of Object.entries(tests)) {
      try {
        await test(baseUrl, containerId)
        console.log(`  ✔ ${name}`)
      } catch (e) {
        failed++
        console.log(`  ✘ ${name}\n    ${e.message}`)
      }
    }

    const logs = run('docker', ['logs', containerId], { stdio: ['ignore', 'pipe', 'pipe'] })
    if (failed > 0) {
      console.log('\ncontainer logs:\n' + logs)
      process.exitCode = 1
    } else {
      console.log(`\n${Object.keys(tests).length} docker tests passing`)
    }
  } finally {
    if (containerId) run('docker', ['rm', '-f', containerId], { stdio: 'ignore' })
    fs.rmSync(buildDir, { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
