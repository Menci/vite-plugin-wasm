import type { Plugin, ResolvedConfig } from "vite";

import { parseWasm } from "./parse-wasm";
import * as wasmHelper from "./wasm-helper";

export default function wasm(): any {
  let resolvedConfig: ResolvedConfig;

  return <Plugin>{
    name: "vite-plugin-wasm",
    enforce: "pre",
    configResolved(config) {
      resolvedConfig = config;
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

      // Get WASM's download URL by Vite's ?url import
      const wasmUrlUrl = id + "?url";

      return `
import __vite__wasmUrl from ${JSON.stringify(wasmUrlUrl)};
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
        .join(", ")} }, __vite__wasmUrl);
${exports
  .map(name => `export ${name === "default" ? "default" : `const ${name} =`} __vite__wasmModule.${name};`)
  .join("\n")}
`;
    }
  };
}
