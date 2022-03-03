import initWasm from "wastyle/dist/astyle.wasm";
import { WASI } from "@wasmer/wasi";

const wasi = new WASI({
  args: [],
  env: {}
});

const wasmExports = await initWasm({
  wasi_snapshot_preview1: wasi.wasiImport
});

if (typeof wasmExports._initialize !== "function") {
  console.error(`wasmExports._initialize is expected to be "function", got "${typeof wasmExports._initialize}"`);
}
