import fs from "fs";

export interface WasmInfo {
  imports: {
    from: string;
    names: string[];
  }[];
  exports: string[];
}

export async function parseWasm(wasmFilePath: string): Promise<WasmInfo> {
  try {
    const wasmBinary = await fs.promises.readFile(wasmFilePath);
    const wasmModule = await WebAssembly.compile(wasmBinary);
    const imports = Object.entries(
      WebAssembly.Module.imports(wasmModule).reduce(
        (result, item) => ({
          ...result,
          [item.module]: [...(result[item.module] || []), item.name]
        }),
        {} as Record<string, string[]>
      )
    ).map(([from, names]) => ({ from, names }));

    const exports = WebAssembly.Module.exports(wasmModule).map(item => item.name);

    return { imports, exports };
  } catch (e) {
    throw new Error(`Failed to parse WASM file: ${e.message}`);
  }
}

export async function generateGlueCode(
  wasmFilePath: string,
  rootPath: string,
  names: { initWasm: string; wasmUrl: string }
): Promise<string> {
  const { imports, exports } = await parseWasm(wasmFilePath);
  return `
${imports
  .map(
    ({ from, names }, i) =>
      `import { ${names.map((name, j) => `${name} as __vite__wasmImport_${i}_${j}`).join(", ")} } from ${JSON.stringify(
        from
      )};`
  )
  .join("\n")}
const __vite__wasmModule = await ${names.initWasm}({ ${imports
    .map(
      ({ from, names }, i) =>
        `${JSON.stringify(from)}: { ${names.map((name, j) => `${name}: __vite__wasmImport_${i}_${j}`).join(", ")} }`
    )
    .join(", ")} }, ${names.wasmUrl}, ${JSON.stringify(rootPath)});
${exports
  .map(name => `export ${name === "default" ? "default" : `const ${name} =`} __vite__wasmModule.${name};`)
  .join("\n")}`;
}
