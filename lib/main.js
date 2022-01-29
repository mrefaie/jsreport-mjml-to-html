module.exports = (reporter, definition) => {
  // add new property to templates
  // reporter.documentStore.model.entityTypes.TemplateType.custom = { type: 'Edm.String' }
  reporter.extensionsManager.recipes.push({
    name: "mjml-to-html",
  });
};
