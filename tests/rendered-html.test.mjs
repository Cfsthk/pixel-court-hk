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
  const [
    app,
    cases,
    generatedCases,
    generatedCases031To040,
    css,
    layout,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/pixel-court.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/case-library.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/generated-cases.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/generated-cases-031-040.ts", import.meta.url),
      "utf8",
    ),
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
  assert.match(app, /calculatePerformance/);
  assert.match(app, /averageTimeSec/);
  assert.match(app, /passageReviews/);
  assert.match(app, /optionChanges/);
  assert.match(app, /performanceScore/);
  assert.match(app, /composite >= 80/);
  assert.match(app, /composite <= 50/);
  assert.match(app, /JUDGE LEVEL UP/);
  assert.match(app, /性別/);
  assert.match(app, /外觀/);
  assert.match(app, /法袍/);
  assert.match(app, /\{ id: "boy", label: "男" \}/);
  assert.match(app, /\{ id: "girl", label: "女" \}/);
  assert.doesNotMatch(app, /不限/);
  assert.doesNotMatch(app, /neutral/);
  assert.doesNotMatch(app, /食物援助轉介|就業支援|家庭社工跟進|可同時加入支援措施/);
  assert.doesNotMatch(app, /角色名冊/);
  assert.doesNotMatch(app, /推薦難度/);
  assert.doesNotMatch(app, /自動儲存 · 獨立案件/);
  assert.doesNotMatch(app, /約 10 分鐘/);
  assert.match(app, /judgmentCloseness/);
  assert.match(app, /verdictReaction/);
  assert.doesNotMatch(app, /screen === "approval"/);
  assert.match(app, /disabled=\{!finding \|\| !punishment \|\| !judgment\.trim\(\)\}/);
  assert.doesNotMatch(app, /judgment\.trim\(\)\.length < 12/);
  assert.match(app, /JUDGE PROFILE/);
  assert.match(app, /我的法官檔案/);
  assert.match(app, /查看我的表現與等級/);
  assert.match(app, /className="human-icon"/);
  assert.doesNotMatch(app, /className="student-hud"/);
  assert.doesNotMatch(app, /SLP CONSOLE|SLP 在場|查看 SLP 紀錄/);
  assert.doesNotMatch(app, /感化令|probation/);
  assert.match(
    app,
    /className="court-brand"[\s\S]*onClick=\{resetGame\}[\s\S]*aria-label="返回案件大廳"/,
  );
  assert.match(app, /records\.length >= 5/);
  assert.match(app, /重看雙方陳詞/);
  assert.equal((cases.match(/caseNumber: "\d{3}"/g) ?? []).length, 20);
  assert.equal(
    (generatedCases.match(/"caseNumber": "\d{3}"/g) ?? []).length,
    10,
  );
  assert.equal(
    (generatedCases031To040.match(/"caseNumber": "\d{3}"/g) ?? []).length,
    10,
  );
  assert.match(app, /\.\.\.authoredCases,[\s\S]*\.\.\.generatedCases,/);
  assert.match(app, /\.\.\.generatedIdealJudgments/);
  assert.match(app, /\.\.\.generatedCases031To040/);
  assert.match(app, /\.\.\.generatedIdealJudgments031To040/);
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

async function loadGeneratedCaseBatch(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  const { generatedCases, generatedIdealJudgments } = await import(moduleUrl);
  return { source, generatedCases, generatedIdealJudgments };
}

function validateGeneratedCaseBatch({
  source,
  generatedCases,
  generatedIdealJudgments,
  expectedFirst,
}) {
  const minimums = { 3: 300, 4: 400, 5: 500, 6: 600 };
  const constructs = [
    "factual",
    "inferential",
    "semantic",
    "integration",
    "evidence",
  ];
  const severity = {
    none: 0,
    warning: 1,
    compensation: 2,
    fine: 3,
    service: 3,
    custody: 5,
  };
  const answerCounts = [0, 0, 0, 0];
  const ids = new Set();

  assert.equal(generatedCases.length, 10);
  assert.equal(Object.keys(generatedIdealJudgments).length, 10);

  generatedCases.forEach((courtCase, caseIndex) => {
    assert.ok(!ids.has(courtCase.id), `duplicate case ID ${courtCase.id}`);
    ids.add(courtCase.id);
    assert.equal(
      Number(courtCase.caseNumber),
      expectedFirst + caseIndex,
      `unexpected case number ${courtCase.caseNumber}`,
    );
    assert.equal(courtCase.questions.length, 5);

    const passages = [
      ...courtCase.passages.prosecution.paragraphs,
      ...courtCase.passages.defence.paragraphs,
    ].join("");
    const characterCount = (
      passages.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []
    ).length;
    assert.ok(
      characterCount >= minimums[courtCase.grade],
      `${courtCase.id} is below its P.${courtCase.grade} minimum`,
    );
    courtCase.questions.forEach((question, questionIndex) => {
      assert.equal(question.construct, constructs[questionIndex]);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(question.answer >= 0 && question.answer <= 3);
      answerCounts[question.answer] += 1;
      const evidenceParts = question.evidence
        .split("／")
        .map((part) => part.replace(/^[「『]|[」』]$/g, "").trim())
        .filter(Boolean);
      assert.ok(
        evidenceParts.every((part) => passages.includes(part)),
        `${question.id} contains an evidence quote not found in the passages`,
      );
      if (question.construct === "semantic") {
        const target = question.prompt.match(/「([^」]+)」/)?.[1];
        assert.ok(target && passages.includes(target));
      }
    });

    const ideal = generatedIdealJudgments[courtCase.id];
    assert.ok(ideal, `${courtCase.id} is missing an ideal judgment`);
    assert.equal(severity[ideal.punishment], ideal.severity);
    const reasoningLength = (
      ideal.reasoning.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []
    ).length;
    assert.ok(reasoningLength >= 70 && reasoningLength <= 150);
    if (["not-guilty", "insufficient"].includes(ideal.finding)) {
      assert.equal(ideal.severity, 0);
    }
  });

  assert.ok(
    Math.max(...answerCounts) - Math.min(...answerCounts) <= 1,
    `answer positions are imbalanced: ${answerCounts.join(", ")}`,
  );
  assert.doesNotMatch(source, /\bcompeting\b/i);
  return ids;
}

test("validates both clinician-reviewed generated case batches", async () => {
  const firstBatch = await loadGeneratedCaseBatch(
    "../app/generated-cases.ts",
  );
  const secondBatch = await loadGeneratedCaseBatch(
    "../app/generated-cases-031-040.ts",
  );

  const firstIds = validateGeneratedCaseBatch({
    ...firstBatch,
    expectedFirst: 21,
  });
  const secondIds = validateGeneratedCaseBatch({
    ...secondBatch,
    expectedFirst: 31,
  });

  assert.equal(
    new Set([...firstIds, ...secondIds]).size,
    firstIds.size + secondIds.size,
  );
});
