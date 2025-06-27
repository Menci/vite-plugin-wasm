import { runTests } from "../e2e";

runTests(7, async () => ({
  vite: await import("vite"),
  // @ts-expect-error: @vitejs/plugin-legacy v7.0.0 doesn't have type export
  vitePluginLegacy: (await import("@vitejs/plugin-legacy")).default,
  vitePluginTopLevelAwait: (await import("vite-plugin-top-level-await")).default
}));
