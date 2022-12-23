# vite-plugin-wasm

[![Test Status](https://img.shields.io/github/actions/workflow/status/Menci/vite-plugin-wasm/test.yaml?branch=main&style=flat-square)](https://github.com/Menci/vite-plugin-wasm/actions?query=workflow%3ATest)
[![npm](https://img.shields.io/npm/v/vite-plugin-wasm?style=flat-square)](https://www.npmjs.com/package/vite-plugin-wasm)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/github/license/Menci/vite-plugin-wasm?style=flat-square)](LICENSE)

Add WebAssembly ESM integration (aka. Webpack's `asyncWebAssembly`) to Vite and support `wasm-pack` generated modules.

## Installation

Now this plugin supports both Vite 2.x and 3.x. Just install it:

```bash
yarn add -D vite-plugin-wasm
```

## Usage

You also need the `vite-plugin-top-level-await` plugin unless you target very modern browsers only (i.e. set `build.target` to `esnext`).

```typescript
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ]
});
```

If you are getting ESBuild errors of WASM files (In the format `No loader is configured for ".wasm" files: node_modules/somepackage/somefile.wasm`) with **Vite < 3.0.3**, please upgrade your Vite to **>= 3.0.3 or upgrade this plugin to >= 3.1.0**. A workaround is adding the corresponding imported module within `node_modules` to `optimizeDeps.exclude`, e.g.:

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: [
      "@syntect/wasm"
    ]
  }
});
```

## Web Worker

To use this plugin in Web Workers. Add it (and `vite-plugin-top-level-await` if necessary) to `worker.plugins` and set `worker.format` to `"es"` (See [#13](https://github.com/Menci/vite-plugin-wasm/issues/13#issuecomment-1295220450)):

```ts
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  worker: {
    format: "es",
    plugins: [
      wasm(),
      topLevelAwait()
    ]
  }
});
```

# Notes

TypeScript typing is broken. Since we can't declare a module with `Record<string, any>` as its named export map. Your `import ... from "./module.wasm";` will still got Vite's bulit-in typing, but the transformed code is fine. So just use an asterisk import `import * as wasmModule from "./module.wasm"` and type assertion (you have typing for your WASM files, right?).
