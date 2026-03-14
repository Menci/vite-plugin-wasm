const mod = await (async () => {
  try {
    return await import("node:test");
  } catch {
    return (await import("test")).default;
  }
})();
const { describe, it, before, after } = mod;

if (typeof before !== "function") {
  throw new Error("'before' should be a function");
}
if (typeof after !== "function") {
  throw new Error("'after' should be a function");
}
if (typeof describe !== "function") {
  throw new Error("'describe' should be a function");
}
if (typeof it !== "function") {
  throw new Error("'it' should be a function");
}
export { describe, it, before, after };
