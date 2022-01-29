# jsreport-mjml-to-html

jsreport recipe transforming mjml to hmtl using node package [mjml](https://github.com/mjmlio/mjml).

## Installation

> **npm install jsreport-mjml-to-html**

## Usage

To use `recipe` in for template rendering set `template.recipe=mjml-to-html` in the rendering request.

```js
{
  template: { content: '...', recipe: 'mjml-to-html', engine: '...' }
}
```

## jsreport-core

You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require("jsreport-core")();
jsreport.use(require("jsreport-mjml-to-html")());
```
