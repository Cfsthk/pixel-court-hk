import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Pixel Court", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /判讀法庭/);
  assert.match(html, /PIXEL COURT/);
  assert.match(html, /新案件/);
  assert.match(html, /角色名冊/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships the complete playable loop", async () => {
  const [app, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/pixel-court.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const construct of [
    "factual",
    "inferential",
    "semantic",
    "integration",
    "evidence",
  ]) {
    assert.match(app, new RegExp(construct));
  }

  assert.match(app, /speechSynthesis/);
  assert.match(app, /pixel-court-last-case/);
  assert.match(app, /SLP/);
  assert.match(app, /records\.length >= 5/);
  assert.match(app, /重看雙方陳詞/);
  assert.match(css, /@keyframes spriteTalk/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(layout, /判讀法庭：像素裁決/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
