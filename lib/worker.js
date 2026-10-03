const mjml = require('mjml')

module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: 'mjml-to-html',
    execute: async (request, response) => {
      // mjml 5 renders asynchronously
      const { html } = await mjml(response.content.toString())
      response.content = Buffer.from(html)
      response.meta.contentType = 'text/html'
      response.meta.fileExtension = 'html'
    }
  })
}
