import type { Plugin } from "vite";

import { esbuildPlugin } from "./esbuild-plugin";
import { generateGlueCode } from "./wasm-parser";
import * as wasmHelper from "./wasm-helper";
import { createBase64UriForWasm } from "./util";

export default function wasm(): any {
  // Vitest reports { ssr: false } to plugins but execute the code in SSR
  // Detect Vitest with the existance of plugin with the name "vitest"
  let runningInVitest = false;
  return <Plugin>{
    name: "vite-plugin-wasm-sri",
    enforce: "pre",
    configResolved(config) {
      runningInVitest = config.plugins.some(plugin => plugin.name === "vitest");

      if (config.optimizeDeps?.esbuildOptions) {
        // https://github.com/Menci/vite-plugin-wasm-sri/pull/11
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
    async load(id, options) {
      if (id === wasmHelper.id) {
        return `export default ${wasmHelper.code}`;
      }

      if (!id.toLowerCase().endsWith(".wasm")) {
        return;
      }

      // Get WASM's download URL by Vite's ?url import
      const wasmUrlUrl = id + "?url";
      const wasmUrlDeclaration =
        options?.ssr || runningInVitest
          ? `const __vite__wasmUrl = ${JSON.stringify(await createBase64UriForWasm(id))}`
          : `import __vite__wasmUrl from ${JSON.stringify(wasmUrlUrl)}`;

      return `
URL = globalThis.URL
${wasmUrlDeclaration}
import __vite__initWasm from "${wasmHelper.id}"
${await generateGlueCode(id, { initWasm: "__vite__initWasm", wasmUrl: "__vite__wasmUrl" })}
`;
    }
  };
}
