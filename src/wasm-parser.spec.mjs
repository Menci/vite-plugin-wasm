import { createRequire } from "module";
import assert from "assert";
import { describe, it } from "../test-helpers.mjs";

const require = createRequire(import.meta.url);
const { parseWasm, generateGlueCode } = require("../dist/wasm-parser.js");

describe("WASM parser", () => {
  it("should parse `wasm-bindgen` generated WASM files correctly", async () => {
    const filename = require.resolve("@syntect/wasm/dist/syntect_bg.wasm");
    assert.deepStrictEqual(await parseWasm(filename), {
      imports: [{ from: "./syntect_bg.js", names: ["__wbindgen_throw"] }],
      exports: [
        "memory",
        "__wbg_getcssresult_free",
        "__wbg_get_getcssresult_css",
        "__wbg_set_getcssresult_css",
        "__wbg_get_getcssresult_error",
        "__wbg_set_getcssresult_error",
        "getCSS",
        "highlight",
        "__wbg_set_highlightresult_html",
        "__wbg_set_highlightresult_language",
        "__wbg_highlightresult_free",
        "__wbg_get_highlightresult_html",
        "__wbg_get_highlightresult_language",
        "__wbindgen_add_to_stack_pointer",
        "__wbindgen_free",
        "__wbindgen_malloc",
        "__wbindgen_realloc"
      ]
    });
  });

  it("should throw error for an invalid WASM file", async () => {
    const filename = require.resolve("@syntect/wasm/dist/syntect_bg.js");
    await assert.rejects(() => parseWasm(filename));
  });
});

describe("generateGlueCode", () => {
  it("should generate valid glue code for WASM with invalid identifier exports (e.g., syscall.seek)", async () => {
    const filename = require.resolve("@wasm-fmt/gofmt/wasm");
    const glueCode = await generateGlueCode(filename, {
      initWasm: "__vite__initWasm",
      wasmUrl: "__vite__wasmUrl"
    });

    assert.ok(glueCode.includes('as "syscall.seek"'));
    assert.ok(!/const syscall\.seek/.test(glueCode));
  });
});
