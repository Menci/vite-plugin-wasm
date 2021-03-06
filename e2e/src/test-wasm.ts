// @syntect/wasm requires WASM to ES module transform
import { highlight } from "@syntect/wasm";

const TEST_CODE = "#include <cstdio>";
const TEST_LANG = "cpp";

const div = document.createElement("div");
div.innerHTML = highlight(TEST_CODE, TEST_LANG, "hl-").html;
const result = div.innerText.trim();
if (result !== TEST_CODE) {
  console.error(`Expected ${JSON.stringify(TEST_CODE)} but got ${JSON.stringify(result)}.`);
}
