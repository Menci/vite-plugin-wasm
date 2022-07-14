import { pass } from "./pass";

Promise.all([import("./test-wasm")]).then(pass);
