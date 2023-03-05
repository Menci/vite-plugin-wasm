import * as vite from "vite";
import { default as vitePluginLegacy } from "@vitejs/plugin-legacy";
import { default as vitePluginTopLevelAwait } from "vite-plugin-top-level-await";

import { runTests } from "../e2e";

runTests(4, {
  vite,
  vitePluginLegacy,
  vitePluginTopLevelAwait
});
