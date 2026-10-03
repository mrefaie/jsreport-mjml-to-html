const JsReport = require('@jsreport/jsreport-core')
const fs = require('fs')
const os = require('os')
const path = require('path')
require('should')

const mjmlDoc = (body, head = '') => `<mjml>${head ? `<mj-head>${head}</mj-head>` : ''}<mj-body><mj-section><mj-column>${body}</mj-column></mj-section></mj-body></mjml>`

describe('mjml-to-html', () => {
  let reporter

  beforeEach(() => {
    reporter = JsReport({ templatingEngines: { strategy: 'in-process' } })
    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-handlebars')())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  const render = (content, extra = {}) => reporter.render({
    template: { content, recipe: 'mjml-to-html', engine: 'none', ...extra.template },
    ...extra.request
  })

  it('should register the recipe in the main process', () => {
    reporter.extensionsManager.recipes.map((r) => r.name).should.containEql('mjml-to-html')
  })

  it('should convert mjml to html', async () => {
    const res = await render(mjmlDoc('<mj-text>Hello</mj-text>'))
    const html = res.content.toString()

    html.should.startWith('<!doctype html>')
    html.should.containEql('Hello')
    html.should.not.containEql('<mj-')
  })

  it('should set html content type and file extension', async () => {
    const res = await render(mjmlDoc('<mj-text>Hello</mj-text>'))

    res.meta.contentType.should.be.eql('text/html')
    res.meta.fileExtension.should.be.eql('html')
  })

  it('should apply mj-head title and attributes', async () => {
    const res = await render(mjmlDoc(
      '<mj-text>Hello</mj-text>',
      '<mj-title>My Title</mj-title><mj-attributes><mj-text color="#ff0000" /></mj-attributes>'
    ))
    const html = res.content.toString()

    html.should.containEql('<title>My Title</title>')
    html.should.containEql('color:#ff0000')
  })

  it('should preserve unicode content', async () => {
    const res = await render(mjmlDoc('<mj-text>مرحبا 日本 ✓</mj-text>'))

    res.content.toString().should.containEql('مرحبا 日本 ✓')
  })

  it('should render handlebars output before converting mjml', async () => {
    const res = await render(
      mjmlDoc('{{#each items}}<mj-text>Item {{this}}</mj-text>{{/each}}'),
      { template: { engine: 'handlebars' }, request: { data: { items: ['A', 'B'] } } }
    )
    const html = res.content.toString()

    html.should.containEql('Item A')
    html.should.containEql('Item B')
    html.should.not.containEql('{{')
  })

  it('should still render when mjml has validation warnings', async () => {
    const res = await render(mjmlDoc('<mj-text foo="bar">Hello</mj-text><mj-unknown />'))

    res.content.toString().should.containEql('Hello')
  })

  it('should not process mj-include (mjml 5 default)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mjml-include-'))
    const partial = path.join(dir, 'partial.mjml')
    fs.writeFileSync(partial, '<mj-text>Included secret</mj-text>')

    try {
      const res = await render(mjmlDoc(`<mj-text>Main</mj-text><mj-include path="${partial}" />`))
      const html = res.content.toString()

      html.should.containEql('Main')
      html.should.not.containEql('Included secret')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should fail the render when content is not mjml', async () => {
    await render('this is not mjml').should.be.rejectedWith(/Parsing failed/)
  })

  it('should fail the render when content is empty', async () => {
    await render('').should.be.rejectedWith(/Parsing failed/)
  })

  it('should render a stored template', async () => {
    await reporter.documentStore.collection('templates').insert({
      name: 'email',
      content: mjmlDoc('<mj-text>Hello {{name}}</mj-text>'),
      recipe: 'mjml-to-html',
      engine: 'handlebars'
    })

    const res = await reporter.render({ template: { name: 'email' }, data: { name: 'stored' } })

    res.content.toString().should.containEql('Hello stored')
    res.meta.contentType.should.be.eql('text/html')
  })

  it('should handle parallel renders', async () => {
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((i) => render(mjmlDoc(`<mj-text>Report ${i}</mj-text>`)))
    )

    results.forEach((res, i) => res.content.toString().should.containEql(`Report ${i + 1}`))
  })
})
