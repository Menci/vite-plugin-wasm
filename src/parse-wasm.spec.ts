/// <reference types="jest-extended" />

import { parseWasm } from "./parse-wasm";
import "jest-extended";

describe("WASM parser", () => {
  it("should parse `wasm-bindgen` generated WASM files correctly", async () => {
    const filename = require.resolve("@syntect/wasm/dist/syntect_bg.wasm");
    expect(await parseWasm(filename)).toStrictEqual({
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
    await expect(parseWasm(filename)).toReject();
  });
});
