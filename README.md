# vite-plugin-wasm

[![Test Status](https://img.shields.io/github/workflow/status/Menci/vite-plugin-wasm/Test?style=flat-square)](https://github.com/Menci/vite-plugin-wasm/actions?query=workflow%3ATest)
[![npm](https://img.shields.io/npm/v/vite-plugin-wasm?style=flat-square)](https://www.npmjs.com/package/vite-plugin-wasm)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/github/license/Menci/vite-plugin-wasm?style=flat-square)](LICENSE)

Add WebAssembly ESM integration (aka. Webpack's `asyncWebAssembly`) to Vite and support `wasm-pack` generated modules.

## Installation

For **Vite 3.x** (latest), please use **2.x** version of this plugin (pure ESM, since Vite is pure ESM):

```bash
yarn add -D vite-plugin-wasm@^2
```

For **Vite 2.x** (latest), please use **1.x** version of this plugin:

```bash
yarn add -D vite-plugin-wasm@^1
```

## Usage

You also need the `vite-plugin-top-level-await` plugin unless you target very modern browsers only (i.e. set `build.target` to `esnext`).

```typescript
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    /**
     * Since 2.x version of this plugin, the `filter` option has been removed.
     * 
     * For 1.x (with Vite 2.x):
     *   By default ALL `.wasm` imports will be transformed to WebAssembly ES module.
     *   You can also set a filter (function or regex) to match files you want to transform.
     *   Other files will fallback to Vite's default WASM loader (i.e. You need to call `initWasm()` for them). 
     *   ```js
     *   wasm({
     *     filter: /syntect_bg.wasm$/
     *   })
     *   ```
     */
    wasm(),
    topLevelAwait()
  ]
});
```

# Notes

TypeScript typing is broken. Since we can't declare a module with `Record<string, any>` as its named export map. Your `import ... from "./module.wasm";` will still got Vite's bulit-in typing, but the transformed code is fine. So just use an asterisk import `import * as wasmModule from "./module.wasm"` and type assertion (you have typing for your WASM files, right?).
