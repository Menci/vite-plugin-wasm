import { pass } from "./pass";

Promise.all([import("./test-wasm"), import("./test-filtered-wasm")]).then(pass);
