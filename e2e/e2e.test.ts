/// <reference types="jest-extended" />

import { firefox } from "playwright";

import * as vite from "vite";
import type { RollupOutput } from "rollup";
import vitePluginLegacy from "@vitejs/plugin-legacy";
import vitePluginTopLevelAwait from "vite-plugin-top-level-await";
import vitePluginWasm from "../src";

import express from "express";
import mime from "mime";
import type { AddressInfo } from "net";

async function build(transformTopLevelAwait: boolean, filterWithRegex: boolean) {
  const result = await vite.build({
    root: __dirname,
    build: {
      target: "esnext"
    },
    plugins: [
      vitePluginLegacy(),
      vitePluginWasm({
        filter: filterWithRegex ? /syntect_bg\.wasm$/ : name => name.endsWith("syntect_bg.wasm")
      }),
      ...(transformTopLevelAwait ? [vitePluginTopLevelAwait()] : [])
    ],
    logLevel: "error"
  });

  if ("close" in result) {
    throw new TypeError("Internal error in Vite");
  }

  return "output" in result ? result : <RollupOutput>{ output: result.flatMap(({ output }) => output) };
}

async function startServer(buildResult: RollupOutput): Promise<string> {
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
      const contentType = mime.lookup(filePath);
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

async function createBrowser(modernBrowser: boolean) {
  return await firefox.launch({
    firefoxUserPrefs: {
      // Simulate a legacy browser with ES modules support disabled
      "dom.moduleScripts.enabled": modernBrowser
    }
  });
}

async function runTest(transformTopLevelAwait: boolean, modernBrowser: boolean, filterWithRegex: boolean) {
  const buildResult = await build(transformTopLevelAwait, filterWithRegex);
  const server = await startServer(buildResult);

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

jest.setTimeout(30000);

describe("E2E test for a modern-legacy build", () => {
  it("should work on modern browser without top-level await transform", async () => {
    await runTest(false, true, false);
  });

  it("should work on modern browser with top-level await transform", async () => {
    await runTest(true, true, false);
  });

  it("should work on legacy browser", async () => {
    await runTest(false, false, false);
  });

  it("should work with regex filter", async () => {
    await runTest(false, true, true);
  });
});
