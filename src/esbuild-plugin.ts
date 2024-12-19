import path from "path";
import type { ResolvedConfig } from "vite";
import { createRequire } from "module";

import * as wasmHelper from "./wasm-helper";
import { generateGlueCode } from "./wasm-parser";
import { createBase64UriForWasm } from "./util";

type ESBuildOptions = ResolvedConfig["optimizeDeps"]["esbuildOptions"];
type ESBuildPlugin = ESBuildOptions["plugins"][number];

export function esbuildPlugin(): ESBuildPlugin {
  return {
    name: "vite-plugin-wasm",
    setup(build) {
      const NAMESPACE = "vite-plugin-wasm-namespace";

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
