import type { Plugin } from "vite";

import { esbuildPlugin } from "./esbuild-plugin";
import { generateGlueCode } from "./wasm-parser";
import * as wasmHelper from "./wasm-helper";

export default function wasm(): any {
  return <Plugin>{
    name: "vite-plugin-wasm",
    enforce: "pre",
    configResolved(config) {
      if (config.optimizeDeps?.esbuildOptions) {
        // https://github.com/Menci/vite-plugin-wasm/pull/11
        if (!config.optimizeDeps.esbuildOptions.plugins) {
          config.optimizeDeps.esbuildOptions.plugins = [];
        }
        config.optimizeDeps.esbuildOptions.plugins.push(esbuildPlugin());

        // Allow usage of top-level await during development build (not affacting the production build)
        config.optimizeDeps.esbuildOptions.target = "esnext";
      }
    },
    resolveId(id) {
      if (id === wasmHelper.id) {
        return id;
      }
    },
    async load(id) {
      if (id === wasmHelper.id) {
        return `export default ${wasmHelper.code}`;
      }

      if (!id.toLowerCase().endsWith(".wasm")) {
        return;
      }

      // Get WASM's download URL by Vite's ?url import
      const wasmUrlUrl = id + "?url";

      return `
URL = globalThis.URL
import __vite__wasmUrl from ${JSON.stringify(wasmUrlUrl)};
import __vite__initWasm from "${wasmHelper.id}"
${await generateGlueCode(id, { initWasm: "__vite__initWasm", wasmUrl: "__vite__wasmUrl" })}
`;
    }
  };
}
