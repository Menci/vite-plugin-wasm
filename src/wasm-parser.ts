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
  names: { initWasm: string; wasmUrl: string }
): Promise<string> {
  const { imports, exports } = await parseWasm(wasmFilePath);

  const importStatements = imports.map(({ from }, i) => {
    return `import * as __vite__wasmImport_${i} from ${JSON.stringify(from)};`;
  });

  const importObject = imports.map(({ from, names }, i) => {
    return {
      key: JSON.stringify(from),
      value: names.map(name => {
        return {
          key: JSON.stringify(name),
          value: `__vite__wasmImport_${i}[${JSON.stringify(name)}]`
        };
      })
    };
  });

  const initCode = `const __vite__wasmModule = await ${names.initWasm}(${codegenSimpleObject(importObject)}, ${
    names.wasmUrl
  });`;

  const exportsStatements = exports.map(name => {
    return `export ${name === "default" ? "default" : `const ${name} =`} __vite__wasmModule.${name};`;
  });

  return [...importStatements, initCode, ...exportsStatements].join("\n");
}

type SimpleObject = SimpleObjectKeyValue[];

interface SimpleObjectKeyValue {
  key: string;
  value: string | SimpleObject;
}

function codegenSimpleObject(obj: SimpleObject): string {
  return `{ ${codegenSimpleObjectKeyValue(obj)} }`;
}

function codegenSimpleObjectKeyValue(obj: SimpleObject): string {
  return obj
    .map(({ key, value }) => {
      return `${key}: ${typeof value === "string" ? value : codegenSimpleObject(value)}`;
    })
    .join(",\n");
}
