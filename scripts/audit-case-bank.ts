import assert from "node:assert/strict";
import { activeCases, activeCasesByGrade } from "../app/active-case-bank";

const gradeRules = {
  1: { characters: [150, 230], episodes: [2, 3] },
  2: { characters: [220, 330], episodes: [3, 3] },
  3: { characters: [300, 400], episodes: [3, 4] },
  4: { characters: [400, 520], episodes: [4, 5] },
  5: { characters: [500, 700], episodes: [5, 6] },
  6: { characters: [600, 800], episodes: [6, 8] },
} as const;

const judgeGuidance = [
  /若只依靠單一回憶/,
  /這些資料未必能直接回答責任問題/,
  /補充紀錄提到/,
  /補充記錄提到/,
  /幫助法官/,
  /法官要/,
  /希望法官/,
  /讀者要分辨/,
  /較完整的判斷需要/,
  /公平決定不只/,
  /雙方都同意/,
];

function chineseLength(value: string) {
  return Array.from(value).filter((character) => /\p{Script=Han}/u.test(character)).length;
}

function sentences(value: string) {
  return value
    .split(/[。！？]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => chineseLength(sentence) >= 8);
}

for (const grade of [1, 2, 3, 4, 5, 6] as const) {
  const cases = activeCasesByGrade[grade];
  const rule = gradeRules[grade];
  assert.equal(cases.length, 30, `P.${grade} must contain exactly 30 cases`);

  for (const courtCase of cases) {
    const prosecution = courtCase.passages.prosecution.paragraphs.join("");
    const defence = courtCase.passages.defence.paragraphs.join("");
    const testimony = prosecution + defence;
    const characterCount = chineseLength(testimony);
    const prosecutionShare = chineseLength(prosecution) / characterCount;

    assert.ok(
      characterCount >= rule.characters[0] && characterCount <= rule.characters[1],
      `${courtCase.id} has ${characterCount} Chinese characters; P.${grade} requires ${rule.characters[0]}–${rule.characters[1]}`,
    );
    assert.ok(
      courtCase.episodes >= rule.episodes[0] && courtCase.episodes <= rule.episodes[1],
      `${courtCase.id} has ${courtCase.episodes} episodes; P.${grade} requires ${rule.episodes[0]}–${rule.episodes[1]}`,
    );
    assert.ok(
      prosecutionShare >= 0.32 && prosecutionShare <= 0.68,
      `${courtCase.id} gives one side a disproportionate amount of text`,
    );
    assert.equal(courtCase.questions.length, 5, `${courtCase.id} must have five questions`);
    assert.deepEqual(
      new Set(courtCase.questions.map((question) => question.construct)),
      new Set(["factual", "inferential", "semantic", "integration", "evidence"]),
      `${courtCase.id} must sample all five comprehension constructs`,
    );

    for (const pattern of judgeGuidance) {
      assert.doesNotMatch(testimony, pattern, `${courtCase.id} contains judge-guiding narration`);
    }

    for (const side of ["prosecution", "defence"] as const) {
      const sideSentences = sentences(courtCase.passages[side].paragraphs.join(""));
      assert.equal(
        new Set(sideSentences).size,
        sideSentences.length,
        `${courtCase.id} repeats a sentence in the ${side} testimony`,
      );
    }

    for (const question of courtCase.questions) {
      assert.equal(question.options.length, 4, `${question.id} must have four options`);
      assert.ok(
        question.answer >= 0 && question.answer < question.options.length,
        `${question.id} has an invalid answer index`,
      );
      assert.ok(question.generalCue.trim(), `${question.id} needs a general cue`);
      assert.ok(question.specificCue.trim(), `${question.id} needs a specific cue`);
    }
  }
}

assert.equal(activeCases.length, 180, "The active bank must contain 180 cases");
console.log("Case-bank audit passed: 180 cases, 30 per grade.");
