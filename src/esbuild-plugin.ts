import path from "path";
import { Plugin } from "esbuild";
import { createRequire } from "module";

import * as wasmHelper from "./wasm-helper";
import { generateGlueCode } from "./wasm-parser";
import { createBase64UriForWasm } from "./util";

export function esbuildPlugin(): Plugin {
  return {
    name: "vite-plugin-wasm-sri",
    setup(build) {
      const NAMESPACE = "vite-plugin-wasm-sri-namespace";

      build.onResolve({ filter: /\.wasm$/ }, args => ({
        path: createRequire(args.importer).resolve(args.path),
        namespace: NAMESPACE
      }));

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async args => {
        const dataUri = await createBase64UriForWasm(args.path);
        return {
          contents: `
const wasmUrl = "${dataUri}";
const initWasm = ${wasmHelper.code};
${await generateGlueCode(args.path, { initWasm: "initWasm", wasmUrl: "wasmUrl" })}
`,
          loader: "js",
          resolveDir: path.dirname(args.path)
        };
      });
    }
  };
}
