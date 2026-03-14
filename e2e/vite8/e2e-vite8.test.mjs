import { runTests } from "../e2e.mjs";

runTests(8, async () => ({
  vite: await import("vite"),
  vitePluginLegacy: (await import("@vitejs/plugin-legacy")).default,
  // vite-plugin-top-level-await v1.6.0 doesn't support Vite 8
  vitePluginTopLevelAwait: undefined,
}));
