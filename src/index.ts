import type { Plugin, ResolvedConfig } from "vite";

import { parseWasm } from "./parse-wasm";
import * as wasmHelper from "./wasm-helper";

export default function wasm(): Plugin {
  let resolvedConfig: ResolvedConfig;
  let originalWasmPlugin: Plugin;
  let resolvePlugin: Plugin;

  return {
    name: "vite-plugin-wasm",
    enforce: "pre",
    configResolved(config) {
      resolvedConfig = config;
      originalWasmPlugin = resolvedConfig.plugins.find(plugin => plugin.name === "vite:wasm-helper");
      resolvePlugin = resolvedConfig.plugins.find(plugin => plugin.name === "vite:resolve");
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

      const { imports, exports } = await parseWasm(id);

      // Make a call to Vite's internal `fileToUrl` function by calling Vite's original WASM plugin's load()
      const originalLoadResult = (await originalWasmPlugin.load.call(this, id + "?init")) as string;
      const url = JSON.parse(/".+"/g.exec(originalLoadResult.trim().split("\n")[1])[0]) as string;
      const importUrls = await Promise.all(
        imports.map(async ({ from }) => {
          const importerPath = id.slice(0, id.lastIndexOf("/")) + from.slice(from.lastIndexOf("/"));
          return resolvePlugin.resolveId.call(this, importerPath, null, null);
        })
      );

      return `
import __vite__initWasm from "${wasmHelper.id}"
${imports
  .map(
    ({ names }, i) =>
      `import { ${names.map((name, j) => `${name} as __vite__wasmImport_${i}_${j}`).join(", ")} } from ${JSON.stringify(
        importUrls[i]
      )};`
  )
  .join("\n")}
const __vite__wasmModule = await __vite__initWasm({ ${imports
        .map(
          ({ from, names }, i) =>
            `${JSON.stringify(from)}: { ${names.map((name, j) => `${name}: __vite__wasmImport_${i}_${j}`).join(", ")} }`
        )
        .join(", ")} }, ${JSON.stringify(url)});
${exports
  .map(name => `export ${name === "default" ? "default" : `const ${name} =`} __vite__wasmModule.${name};`)
  .join("\n")}
`;
    }
  };
}
