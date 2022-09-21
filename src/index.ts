import type { Plugin, ResolvedConfig } from "vite";

import { parseWasm } from "./parse-wasm";
import * as wasmHelper from "./wasm-helper";

export default function wasm(): Plugin {
  let resolvedConfig: ResolvedConfig;
  let originalWasmPlugin: Plugin;
  let moduleIds: string[] = [];

  return {
    name: "vite-plugin-wasm",
    enforce: "pre",
    configResolved(config) {
      resolvedConfig = config;
      originalWasmPlugin = resolvedConfig.plugins.find(plugin => plugin.name === "vite:wasm-helper");
    },
    resolveId(id) {
      if (id === wasmHelper.id) {
        return id;
      }
    },
    async load(id) {
      moduleIds.push(id);
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
      const importUrls = await Promise.all(imports.map(async ({ from }) => getImportUrl(id, from, moduleIds)));

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

async function getImportUrl(id: string, from: string, moduleIds: string[]) {
  const importerPath = path.resolve(id, "../" + from);
  if (importerPath.indexOf("node_modules") === -1) {
    // Local js won't have versionHash, so the importerPath is importerId
    return importerPath;
  }
  // The module may be pre-bundled, pre-bundling js file has higher priority than original file.
  const preBundlingPath = getPreBundlePath(importerPath);
  return (
    moduleIds.find(v => v.startsWith(preBundlingPath)) ||
    moduleIds.find(v => v.startsWith(importerPath)) ||
    importerPath
  );
}

function getPreBundlePath(importerPath: string) {
  const [prefix, modulePath] = importerPath.split("node_modules/");
  const modulePathParts = modulePath.split("/");
  let pkgName = modulePathParts[0];
  if (pkgName.startsWith("@")) {
    // Scope Package
    pkgName = `${modulePathParts[0]}_${modulePathParts[1]}`;
  }
  return `${prefix}node_modules/.vite/deps/${pkgName}.js`;
}
