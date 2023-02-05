import fs from "fs";

export async function createBase64UriForWasm(filePath: string) {
  const base64 = await fs.promises.readFile(filePath, "base64");
  return "data:application/wasm;base64," + base64;
}
