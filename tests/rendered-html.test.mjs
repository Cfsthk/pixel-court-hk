import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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
  assert.match(html, /法官報到/);
  assert.match(html, /班號數字鍵盤/);
  assert.match(html, /進入法庭/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships the complete playable loop", async () => {
  const [app, cases, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/pixel-court.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/case-library.ts", import.meta.url), "utf8"),
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
  assert.match(app, /shuffleOptions/);
  assert.match(app, /studentProgressKey/);
  assert.match(app, /judgeAvatar/);
  assert.match(app, /judgeLevelThresholds/);
  assert.match(app, /getUnlockedDifficulty/);
  assert.match(app, /updateJudgeAvatar/);
  assert.match(app, /JUDGE LEVEL UP/);
  assert.match(app, /性別/);
  assert.match(app, /外觀/);
  assert.match(app, /法袍/);
  assert.doesNotMatch(app, /角色名冊/);
  assert.doesNotMatch(app, /推薦難度/);
  assert.doesNotMatch(app, /自動儲存 · 獨立案件/);
  assert.doesNotMatch(app, /約 10 分鐘/);
  assert.match(app, /judgmentCloseness/);
  assert.match(app, /verdictReaction/);
  assert.doesNotMatch(app, /screen === "approval"/);
  assert.match(app, /disabled=\{!finding \|\| !punishment \|\| !judgment\.trim\(\)\}/);
  assert.doesNotMatch(app, /judgment\.trim\(\)\.length < 12/);
  assert.match(app, /SLP/);
  assert.match(app, /records\.length >= 5/);
  assert.match(app, /重看雙方陳詞/);
  assert.equal((cases.match(/caseNumber: "\d{3}"/g) ?? []).length, 20);
  assert.match(cases, /grade: 1/);
  assert.match(cases, /grade: 6/);
  assert.match(cases, /edbFocus/);
  assert.match(cases, /idealJudgments/);
  assert.match(cases, /challengingOptions/);
  assert.match(css, /@keyframes spriteTalk/);
  assert.match(css, /\.player-judge/);
  assert.match(css, /\.avatar-customizer/);
  assert.match(css, /\.level-track/);
  assert.match(
    css.match(/\.court-clock\s*\{[\s\S]*?\}/)?.[0] ?? "",
    /left:\s*50%/,
  );
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.doesNotMatch(
    css.match(/\.passage-paper\s*\{[\s\S]*?\}/)?.[0] ?? "",
    /repeating-linear-gradient/,
  );
  assert.match(layout, /判讀法庭：像素裁決/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("enforces the upper-primary case-length ladder", async () => {
  const source = await readFile(
    new URL("../app/case-library.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  const { caseLibrary, countCaseCharacters, idealJudgments } = await import(
    moduleUrl
  );
  const minimums = { 3: 300, 4: 400, 5: 500, 6: 600 };

  assert.equal(caseLibrary.length, 20);
  assert.equal(Object.keys(idealJudgments).length, 20);
  for (const courtCase of caseLibrary.filter((item) => item.grade >= 3)) {
    assert.ok(
      countCaseCharacters(courtCase) >= minimums[courtCase.grade],
      `${courtCase.id} is below its P.${courtCase.grade} minimum`,
    );
    assert.equal(courtCase.questions.length, 5);
    assert.ok(courtCase.questions.every((question) => question.options.length === 4));
  }
});
