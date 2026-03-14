import path from "path";
import url from "url";
import fs from "fs";
import assert from "assert";

import { describe, it } from "../test-helpers.mjs";
import { firefox, chromium } from "playwright";

import vitePluginWasm from "../exports/import.mjs";

import express from "express";
import waitPort from "wait-port";
import mime from "mime";
import { temporaryDirectory } from "tempy";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function buildAndStartProdServer(tempDir, vitePackages, transformTopLevelAwait, modernOnly) {
  const { vite, vitePluginLegacy, vitePluginTopLevelAwait } = vitePackages;

  const result = await vite.build({
    root: __dirname,
    build: {
      target: "esnext",
      outDir: path.resolve(tempDir, "dist")
    },
    cacheDir: path.resolve(tempDir, ".vite"),
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

  const buildResult = "output" in result ? result : { output: result.flatMap(({ output }) => output) };

  const app = express();

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

  const server = await new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });

  const port = server.address().port;
  return { url: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

async function startDevServer(tempDir, vitePackages) {
  const { vite } = vitePackages;

  const devServer = await vite.createServer({
    root: __dirname,
    plugins: [vitePluginWasm()],
    cacheDir: path.resolve(tempDir, ".vite"),
    logLevel: "error"
  });

  await devServer.listen();
  const listeningAddress = devServer.httpServer?.address();
  if (typeof listeningAddress !== "object" || !listeningAddress)
    throw new Error("Vite dev server doen't listen on a port");

  await waitPort({ port: listeningAddress.port, output: "silent" });
  return { url: `http://localhost:${listeningAddress.port}`, close: () => devServer.close() };
}

async function createBrowser(modernBrowser) {
  return modernBrowser
    ? await chromium.launch()
    : await firefox.launch({
        firefoxUserPrefs: {
          // Simulate a legacy browser with ES modules support disabled
          "dom.moduleScripts.enabled": false
        }
      });
}

async function runTest(vitePackages, devServer, transformTopLevelAwait, modernBrowser) {
  const tempDir = temporaryDirectory();
  process.on("exit", () => {
    try {
      fs.rmdirSync(tempDir, { recursive: true });
    } catch {}
  });

  const { url, close } = await (devServer ? startDevServer : buildAndStartProdServer)(
    tempDir,
    vitePackages,
    transformTopLevelAwait,
    modernBrowser
  );

  const browser = await createBrowser(modernBrowser);
  try {
    const page = await browser.newPage();

    page.goto(url);

    const expectedLog = `PASS! (modernBrowser = ${modernBrowser})`;
    const expectedLogPrefix = "PASS!";
    const foundLog = await new Promise((resolve, reject) => {
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

    assert.strictEqual(foundLog, expectedLog);
  } finally {
    await browser.close();
    close();
  }
}

// Vite 2 dev server test often fails with RequestError. Let's retry.
const runTestWithRetry = async (...args) => {
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

export function runTests(viteVersion, importVitePackages) {
  describe(`E2E test for Vite ${viteVersion}`, () => {
    const nodeVersion = Number(process.versions.node.split(".")[0]);

    if (viteVersion >= 7 && nodeVersion < 20) {
      it(`vite ${viteVersion}: skipped on Node.js ${nodeVersion}`, async () => {});
      return;
    }

    if (viteVersion >= 5 && nodeVersion < 18) {
      it(`vite ${viteVersion}: skipped on Node.js ${nodeVersion}`, async () => {});
      return;
    }

    it(`vite ${viteVersion}: should work on modern browser in Vite dev server`, { timeout: 600000 }, async () => {
      await runTestWithRetry(await importVitePackages(), true, false, true);
    });

    it(
      `vite ${viteVersion}: should work on modern browser without top-level await transform`,
      { timeout: 600000 },
      async () => {
        await runTestWithRetry(await importVitePackages(), false, false, true);
      }
    );

    it(
      `vite ${viteVersion}: should work on modern browser with top-level await transform`,
      { timeout: 600000 },
      async () => {
        await runTestWithRetry(await importVitePackages(), false, true, true);
      }
    );

    it(`vite ${viteVersion}: should work on legacy browser`, { timeout: 600000 }, async () => {
      await runTestWithRetry(await importVitePackages(), false, true, false);
    });
  });
}
