export interface Options {
  /**
   * Filter which `.wasm` files should be transform to ES modules.
   *
   * For each `.wasm`, its relative path to project root (e.g.
   * "./node_modules/@syntect/wasm/dist/syntect_bg.wasm") will be pass to
   * the RegExp or function. RegExp matches, or function
   * returns true, means process this file.
   *
   * By default ALL `.wasm` files
   */
  filter?: RegExp | ((wasmFilePath: string) => boolean);
}

export const DEFAULT_OPTIONS: Options = {
  filter: null
};
