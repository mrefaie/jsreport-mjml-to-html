const mjml = require("mjml");

module.exports = (reporter, definition) => {
  reporter.extensionsManager.recipes.push({
    name: "mjml-to-html",
    execute: (request, response) => {
      response.content = Buffer.from(mjml(response.content.toString()).html);
      response.meta.contentType = "text/html";
      response.meta.fileExtension = "html";
    },
  });
};
