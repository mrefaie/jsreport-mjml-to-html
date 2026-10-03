# jsreport-mjml-to-html

jsreport recipe transforming [mjml](https://github.com/mjmlio/mjml) to html.

## Requirements

| jsreport-mjml-to-html | jsreport | Node.js   | mjml   |
| --------------------- | -------- | --------- | ------ |
| 1.x                   | 4.x      | >= 22.18  | 5.4.1  |
| 0.0.x                 | 3.x      | -         | 4.12.0 |

## Installation

> **npm install jsreport-mjml-to-html**

Then restart jsreport. The recipe is picked up automatically and shows up as `mjml-to-html` in the studio recipe list.

### Docker

```dockerfile
FROM jsreport/jsreport:4.14.2
RUN npm install jsreport-mjml-to-html
```

## Usage

To use the recipe for template rendering, set `template.recipe=mjml-to-html` in the rendering request.

```js
{
  template: { content: '...', recipe: 'mjml-to-html', engine: '...' }
}
```

The templating engine runs first, so you can use handlebars (or any other engine) inside the mjml markup:

```js
{
  template: {
    content: '<mjml><mj-body><mj-section><mj-column>{{#each items}}<mj-text>{{this}}</mj-text>{{/each}}</mj-column></mj-section></mj-body></mjml>',
    recipe: 'mjml-to-html',
    engine: 'handlebars'
  },
  data: { items: ['One', 'Two'] }
}
```

The output has content type `text/html` and file extension `html`.

mjml validation runs in `soft` mode: invalid attributes or unknown elements still produce html. Content that can't be parsed as mjml at all (for example plain text or an empty template) fails the render with `Parsing failed. Check your mjml.`

## jsreport-core

You can also apply this extension manually to [jsreport-core](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-core):

```js
const jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('jsreport-mjml-to-html')())
```

## Migration guide: 0.0.x to 1.0.0

1.0.0 targets jsreport 4 and mjml 5. If you are still on jsreport 3, stay on the old version:

```sh
npm install jsreport-mjml-to-html@0.0.3
```

To upgrade:

1. **Upgrade jsreport to 4.x first.** The extension now declares `core: 4.x.x` / `studio: 4.x.x` and will not load into jsreport 3. Follow the [jsreport 4.0.0 release notes](https://jsreport.net/blog/jsreport-400-release), which cover the breaking changes.
2. **Use Node.js 22.18 or newer**, the minimum this version supports and the one current jsreport 4 releases require. The official `jsreport/jsreport:4.x` Docker images already include a compatible Node.js.
3. **Install the new version:** `npm install jsreport-mjml-to-html@1`.
4. **If you use jsreport-core directly**, switch from the old `jsreport-core` package to `@jsreport/jsreport-core` (see the example above).
5. **Replace `<mj-include>`.** mjml 5 ignores `<mj-include>` by default, while mjml 4.12 processed it, so included files are now silently left out of the output. Move shared parts into jsreport [components](https://jsreport.net/learn/components) or [child templates](https://jsreport.net/learn/child-templates) instead. These are stored in jsreport and don't depend on the server's file system.
6. **Re-check your rendered emails.** mjml 5 is a new major version and its generated html may differ from 4.12. See the [mjml releases](https://github.com/mjmlio/mjml/releases) for details.

Rendering requests don't change: the recipe name is still `mjml-to-html`, and it still returns `text/html` with the `html` extension.

## Development

```sh
npm install
npm test             # unit tests against @jsreport/jsreport-core + standard lint
npm run test:docker  # integration tests in the official jsreport docker image (requires docker)
```

`npm run test:docker` builds the studio bundle, packs the plugin like `npm publish` would, installs it into `jsreport/jsreport:4.14.2` and checks it through the HTTP API: the recipe list, rendering with handlebars, rendering a stored template, the error for invalid mjml, and loading the studio bundle. Set `JSREPORT_VERSION` to test another jsreport 4 version:

```sh
JSREPORT_VERSION=4.13.0 npm run test:docker
```

## Changelog

### 1.0.0 (2026-10-03)

**Breaking changes**

- Requires jsreport 4.x (`core: 4.x.x`, `studio: 4.x.x`). jsreport 3 is no longer supported.
- Requires Node.js >= 22.18.
- Upgraded `mjml` from 4.12.0 to 5.4.1. `<mj-include>` is no longer processed (mjml 5 default), and the html output may differ.

**Fixes**

- The recipe now awaits mjml's asynchronous render. mjml 5 returns a Promise, and the old synchronous call would have crashed every render.

**Internal**

- Upgraded `@jsreport/studio-dev` to 4.1.1 and `standard` to 17.1.2.
- The studio bundle is built on `prepublishOnly` instead of the deprecated `prepublish`, which also ran on every `npm install`.
- Added a mocha test suite against `@jsreport/jsreport-core` 4 and docker integration tests against the official jsreport image.
- Removed the unused `.eslintrc`, which referenced uninstalled and deprecated packages, and the leftover studio debug logs.

### 0.0.3 (2022-01-29)

- Release for jsreport 3 with `mjml` 4.12.0.

### 0.0.1 – 0.0.2 (2022-01-29)

- Initial releases.
