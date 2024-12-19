/// <reference types="jest-extended" />
/* istanbul ignore file */

import { jest } from "@jest/globals";
import { firefox } from "playwright";

import type { RollupOutput } from "rollup";
import vitePluginWasm from "../src/index.js";

import express from "express";
import waitPort from "wait-port";
import mime from "mime";
import path from "path";
import url from "url";
import type { AddressInfo } from "net";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

type VitePackages =
  | {
      vite: typeof import("./vite2/node_modules/vite");
      vitePluginLegacy: (typeof import("./vite2/node_modules/@vitejs/plugin-legacy"))["default"];
      vitePluginTopLevelAwait: (typeof import("./vite2/node_modules/vite-plugin-top-level-await"))["default"];
    }
  | {
      vite: typeof import("./vite3/node_modules/vite");
      vitePluginLegacy: (typeof import("./vite3/node_modules/@vitejs/plugin-legacy"))["default"];
      vitePluginTopLevelAwait: (typeof import("./vite3/node_modules/vite-plugin-top-level-await"))["default"];
    }
  | {
      vite: typeof import("./vite4/node_modules/vite");
      vitePluginLegacy: (typeof import("./vite4/node_modules/@vitejs/plugin-legacy"))["default"];
      vitePluginTopLevelAwait: (typeof import("./vite4/node_modules/vite-plugin-top-level-await"))["default"];
    }
  | {
      vite: typeof import("./vite5/node_modules/vite");
      vitePluginLegacy: (typeof import("./vite5/node_modules/@vitejs/plugin-legacy"))["default"];
      vitePluginTopLevelAwait: (typeof import("./vite5/node_modules/vite-plugin-top-level-await"))["default"];
    }
  | {
      vite: typeof import("./vite6/node_modules/vite");
      vitePluginLegacy: (typeof import("./vite6/node_modules/@vitejs/plugin-legacy"))["default"];
      vitePluginTopLevelAwait: (typeof import("./vite6/node_modules/vite-plugin-top-level-await"))["default"];
    };

async function buildAndStartProdServer(
  viteVersion: number,
  vitePackages: VitePackages,
  transformTopLevelAwait: boolean,
  modernOnly: boolean
): Promise<string> {
  const { vite, vitePluginLegacy, vitePluginTopLevelAwait } = vitePackages;

  const result = await vite.build({
    root: __dirname,
    build: {
      target: "esnext"
    },
    cacheDir: path.resolve(__dirname, "node_modules", `.vite${viteVersion}`),
    plugins: [
      ...(modernOnly ? [] : [vitePluginLegacy()]),
      vitePluginWasm(),
      ...(transformTopLevelAwait ? [vitePluginTopLevelAwait()] : [])
    ],
    logLevel: "error"
  });

  if ("close" in result) {
    throw new TypeError("Internal error in Vite");
  }

  const buildResult =
    "output" in result ? result : ({ output: result.flatMap(({ output }) => output) } as RollupOutput);

  const app = express();
  let port = 0;

  const bundle = Object.fromEntries(
    buildResult.output.map(item => [item.fileName, item.type === "chunk" ? item.code : item.source])
  );

  app.use((req, res) => {
    // Remove leading "/"
    const filePath = (req.path === "/" ? "/index.html" : req.path).slice(1);

    if (filePath in bundle) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "*");
      const contentType = mime.getType(filePath) || "application/octet-stream";
      const contentTypeWithEncoding = contentType + (contentType.includes("text/") ? "; charset=utf-8" : "");
      res.contentType(contentTypeWithEncoding);
      res.send(bundle[filePath]);
    } else {
      res.status(404).end();
    }
  });

  const listen = async () =>
    await new Promise<number>(resolve => {
      const server = app.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
    });

  port = await listen();

  return `http://127.0.0.1:${port}/`;
}

async function startDevServer(viteVersion: number, vitePackages: VitePackages): Promise<string> {
  const { vite } = vitePackages;

  const devServer = await vite.createServer({
    root: __dirname,
    plugins: [vitePluginWasm()],
    cacheDir: path.resolve(__dirname, "node_modules", `.vite${viteVersion}`),
    logLevel: "error"
  });

  await devServer.listen();
  const listeningAddress = devServer.httpServer?.address();
  if (typeof listeningAddress !== "object" || !listeningAddress)
    throw new Error("Vite dev server doen't listen on a port");

  await waitPort({ port: listeningAddress.port, output: "silent" });
  return `http://localhost:${listeningAddress.port}`;
}

async function createBrowser(modernBrowser: boolean) {
  return await firefox.launch({
    firefoxUserPrefs: {
      // Simulate a legacy browser with ES modules support disabled
      "dom.moduleScripts.enabled": modernBrowser
    }
  });
}

async function runTest(
  viteVersion: number,
  vitePackages: VitePackages,
  devServer: boolean,
  transformTopLevelAwait: boolean,
  modernBrowser: boolean
) {
  const server = await (devServer ? startDevServer : buildAndStartProdServer)(
    viteVersion,
    vitePackages,
    transformTopLevelAwait,
    modernBrowser
  );

  const browser = await createBrowser(modernBrowser);
  const page = await browser.newPage();

  page.goto(server);

  const expectedLog = `PASS! (modernBrowser = ${modernBrowser})`;
  const expectedLogPrefix = "PASS!";
  const foundLog = await new Promise<string>((resolve, reject) => {
    // Expect no errors
    page.on("pageerror", reject);
    page.on("requestfailed", reject);
    page.on("crash", reject);

    page.on("console", async message => {
      // Expect no errors from console
      if (message.type() === "error") {
        reject(new Error("Error message from browser console: " + message.text()));
      }

      // Expect the log (see `src/content.ts`)
      if (message.type() === "log" && message.text().startsWith(expectedLogPrefix)) {
        resolve(message.text());
      }
    });
  });

  expect(foundLog).toEqual(expectedLog);
}

// Vite 2 dev server test often fails with RequestError. Let's retry.
const runTestWithRetry = async (...args: Parameters<typeof runTest>) => {
  const MAX_RETRY = 10;
  const RETRY_WAIT = 1000;

  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      await runTest(...args);
      break;
    } catch (e) {
      // Retry on Playwright Request Error
      if (e._type === "Request" || i !== MAX_RETRY - 1) {
        await new Promise(r => setTimeout(r, RETRY_WAIT));
        continue;
      }

      throw e;
    }
  }
};

export function runTests(viteVersion: number, importVitePackages: () => Promise<VitePackages>) {
  jest.setTimeout(60000);

  describe(`E2E test for Vite ${viteVersion}`, () => {
    const nodeVersion = Number(process.versions.node.split(".")[0]);
    if (viteVersion >= 5 && nodeVersion < 18) {
      it(`vite ${viteVersion}: skipped on Node.js ${nodeVersion}`, async () => {});
      return;
    }

    it(`vite ${viteVersion}: should work on modern browser in Vite dev server`, async () => {
      await runTestWithRetry(viteVersion, await importVitePackages(), true, false, true);
    });

    it(`vite ${viteVersion}: should work on modern browser without top-level await transform`, async () => {
      await runTestWithRetry(viteVersion, await importVitePackages(), false, false, true);
    });

    it(`vite ${viteVersion}: should work on modern browser with top-level await transform`, async () => {
      await runTestWithRetry(viteVersion, await importVitePackages(), false, true, true);
    });

    it(`vite ${viteVersion}: should work on legacy browser`, async () => {
      await runTestWithRetry(viteVersion, await importVitePackages(), false, true, false);
    });
  });
}
