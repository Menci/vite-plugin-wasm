import fs from "fs";
import { posix as path } from "path";
import { Plugin } from "esbuild";

import * as wasmHelper from "./wasm-helper";
import { generateGlueCode } from "./wasm-parser";

export function esbuildPlugin(): Plugin {
  return {
    name: "vite-plugin-wasm",
    setup(build) {
      const NAMESPACE = "vite-plugin-wasm-namespace";

      build.onResolve({ filter: /\.wasm$/ }, args => ({
        path: path.join(path.dirname(args.importer), args.path),
        namespace: NAMESPACE
      }));

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async args => {
        const base64 = await fs.promises.readFile(args.path, "base64");
        const dataUri = "data:application/wasm;base64," + base64;
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
