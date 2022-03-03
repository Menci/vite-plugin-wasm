import path from "path";

import type { Plugin, ResolvedConfig } from "vite";

import { DEFAULT_OPTIONS, Options } from "./options";
import { parseWasm } from "./parse-wasm";
import * as wasmHelper from "./wasm-helper";

export default function wasm(options?: Options): Plugin {
  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...(options || /* istanbul ignore next */ {})
  };

  let resolvedConfig: ResolvedConfig;
  let originalWasmPlugin: Plugin;

  return {
    name: "vite-plugin-top-level-await",
    enforce: "pre",
    configResolved(config) {
      resolvedConfig = config;
      originalWasmPlugin = resolvedConfig.plugins.find(plugin => plugin.name === "vite:wasm");
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

      if (resolvedOptions.filter) {
        const relativePath = path.relative(resolvedConfig.root, id);
        if (typeof resolvedOptions.filter === "function") {
          if (!resolvedOptions.filter(relativePath)) return;
        } else if (Object.prototype.toString.call(resolvedOptions.filter) === "[object RegExp]") {
          if (!resolvedOptions.filter.test(relativePath)) return;
        }
      }

      const { imports, exports } = await parseWasm(id);

      // Make a call to Vite's internal `fileToUrl` function by calling Vite's original WASM plugin's load()
      const originalLoadResult = (await originalWasmPlugin.load.call(this, id)) as string;
      const url = JSON.parse(/".+"/g.exec(originalLoadResult.trim().split("\n")[1])[0]) as string;

      return `
import __vite__initWasm from "${wasmHelper.id}"
${imports
  .map(
    ({ from, names }, i) =>
      `import { ${names.map((name, j) => `${name} as __vite__wasmImport_${i}_${j}`).join(", ")} } from ${JSON.stringify(
        from
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
