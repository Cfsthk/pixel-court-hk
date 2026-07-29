import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [inputPath, outputPath = "app/generated-cases.ts"] = process.argv.slice(2);

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/import-generated-cases.mjs <input.csv> [output.ts]",
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (quoted) throw new Error("CSV ends inside a quoted field.");
  return rows;
}

const contentRevisions = {
  c023: {
    ideal_finding: "insufficient",
    ideal_punishment: "none",
    ideal_severity: "0",
    ideal_reasoning:
      "閉路電視只證明兩人在場，未能顯示誰按下按鈕；投訴方只提出懷疑，回應方則有兩次書面反映卡紙及過熱。現有資料支持機件老化的可能，但仍不能確定直接原因，因此證據不足，無需處分，應由公司先作技術檢驗。",
  },
  c024: {
    ideal_reasoning:
      "司機的說法有正式封路通告、交通廣播及公司維修紀錄可供核查，車費亦按咪錶計算；乘客只以路程和車費增加推斷故意繞路。司機應更清楚說明可能增加的費用，但現有資料不足以支持惡意指控，罪名不成立且無需處分。",
  },
  c025: {
    prosecution_p2:
      "我即時向侍應指出錯誤，要求更換正確的菜式。侍應表示廚房繁忙，起初只提出把海鮮挑走；但我對海鮮敏感，這不能避免過敏風險，也不是安全的做法。",
    defence_p2:
      "顧客表示對海鮮敏感，但點菜時並未特別提醒我們。我們提議免費重新做一份正確的，並說明不會只把海鮮挑走，以免仍有過敏風險，但顧客堅持全數退款。",
    ideal_finding: "guilty",
    ideal_punishment: "compensation",
    ideal_severity: "2",
    ideal_reasoning:
      "餐廳承認送錯菜，顧客點選的菜式本來不含海鮮，沒有事先申報敏感也不會使錯誤消失。餐廳其後提出重做，但顧客已面對食物安全風險且沒有進食。餐廳應負主要責任，以合理退款或賠償處理，並改善核對程序。",
    q5_option_0: "提議免費重新製作正確菜式，並避免只挑走海鮮",
    q5_evidence_quote: "我們提議免費重新做一份正確的",
  },
  c026: {
    ideal_punishment: "none",
    ideal_severity: "0",
    ideal_reasoning:
      "管理處初步指向樓上水管，但技術人員未全面檢查樓上浴室和公共管道；回應方也表示單位內沒有明顯水跡。現有資料未能排除公共管道或外牆問題，因此證據不足，現階段不應處分任何一方，應先安排獨立檢測。",
  },
  c027: {
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "音響雖獲批准，但投訴方曾多次要求降低，回應方承認為維持遊戲效果再次調高；另一方面，銷售下降也可能受天氣、定價和人流影響，不能全歸因於噪音。雙方都應改善協調，以正式警告提醒遵守音量和相鄰攤位安排。",
  },
  c028: {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "署方表示申請已提交，但既定程序仍要求廣泛收集居民意見及公示結果；居民會只有入口告示和一次簡短說明會，未能證明已完成較廣泛諮詢。綠化目的正當且樹木已有原則批准，因此以責任成立和正式警告處理，比移除樹木或嚴厲處分相稱。",
  },
  c029: {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "黃先生承認把垃圾袋放在門外，而大廈規則要求垃圾放入指定位置；垃圾桶是否接近滿載，不改變走廊受異味和阻塞影響的事實。由於他翌日已清理並表示會改善，宜判主要責任成立並作正式警告，不需更重處分。",
  },
  c030: {
    ideal_reasoning:
      "賣家的文字稱「無明顯損毀」，與買家收到的多處刮痕及角位缺損有差距；但照片已顯示部分使用痕跡，買家也沒有進一步查詢。雙方在披露和核對上均有不足，宜由賣家補償合理差價，而不是要求全額退款。",
  },
};

const rawRows = parseCsv(await readFile(inputPath, "utf8"));
const [header, ...valueRows] = rawRows;
const expectedColumns = 75;

if (header.length !== expectedColumns) {
  throw new Error(`Expected ${expectedColumns} columns; found ${header.length}.`);
}

const rows = valueRows.map((values, rowIndex) => {
  if (values.length !== header.length) {
    throw new Error(
      `Row ${rowIndex + 2} has ${values.length} columns; expected ${header.length}.`,
    );
  }
  const row = Object.fromEntries(
    header.map((column, index) => [column, values[index]]),
  );
  Object.assign(row, contentRevisions[row.case_id] ?? {});
  for (const key of Object.keys(row)) {
    row[key] = row[key]
      .replaceAll(" competing ", " 相互競爭的 ")
      .replaceAll("competing ", "相互競爭的 ")
      .replaceAll("什麼", "甚麼");
  }
  return row;
});

const findingValues = new Set([
  "guilty",
  "not-guilty",
  "insufficient",
  "shared",
]);
const punishmentSeverity = {
  none: 0,
  warning: 1,
  compensation: 2,
  fine: 3,
  service: 3,
  probation: 4,
  custody: 5,
};
const constructs = [
  "factual",
  "inferential",
  "semantic",
  "integration",
  "evidence",
];
const minimumCharacters = { 3: 300, 4: 400, 5: 500, 6: 600 };
const seenIds = new Set();
let questionIndex = 0;

for (const row of rows) {
  const normalizedId = `c${Number(row.case_number)}`;
  if (seenIds.has(normalizedId)) throw new Error(`Duplicate ID: ${normalizedId}`);
  seenIds.add(normalizedId);
  row.normalized_id = normalizedId;

  const grade = Number(row.grade);
  const passages = ["prosecution", "defence"]
    .flatMap((side) => [1, 2, 3].map((index) => row[`${side}_p${index}`]))
    .join("");
  const characterCount = (
    passages.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []
  ).length;
  if (characterCount < minimumCharacters[grade]) {
    throw new Error(
      `${normalizedId} has ${characterCount} characters; P.${grade} requires ${minimumCharacters[grade]}.`,
    );
  }
  row.declared_char_count = String(characterCount);

  if (!findingValues.has(row.ideal_finding)) {
    throw new Error(`${normalizedId} has invalid finding ${row.ideal_finding}.`);
  }
  if (
    punishmentSeverity[row.ideal_punishment] !== Number(row.ideal_severity)
  ) {
    throw new Error(`${normalizedId} has inconsistent punishment severity.`);
  }
  const reasoningLength = (
    row.ideal_reasoning.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []
  ).length;
  if (reasoningLength < 70 || reasoningLength > 150) {
    throw new Error(
      `${normalizedId} ideal reasoning has ${reasoningLength} Chinese characters.`,
    );
  }

  for (let number = 1; number <= 5; number += 1) {
    if (row[`q${number}_construct`] !== constructs[number - 1]) {
      throw new Error(`${normalizedId} Q${number} has the wrong construct.`);
    }
    const options = [0, 1, 2, 3].map(
      (index) => row[`q${number}_option_${index}`],
    );
    const answer = Number(row[`q${number}_answer_index`]);
    if (new Set(options).size !== 4 || !Number.isInteger(answer)) {
      throw new Error(`${normalizedId} Q${number} has invalid options.`);
    }

    const correct = options[answer];
    const distractors = options.filter((_, index) => index !== answer);
    const targetAnswer = questionIndex % 4;
    distractors.splice(targetAnswer, 0, correct);
    distractors.forEach((option, index) => {
      row[`q${number}_option_${index}`] = option;
    });
    row[`q${number}_answer_index`] = String(targetAnswer);
    questionIndex += 1;

    const evidenceParts = row[`q${number}_evidence_quote`]
      .split("／")
      .map((part) => part.replace(/^[「『]|[」』]$/g, "").trim())
      .filter(Boolean);
    if (evidenceParts.some((part) => !passages.includes(part))) {
      throw new Error(`${normalizedId} Q${number} quotes missing evidence.`);
    }
  }
}

const generatedCases = rows.map((row) => ({
  id: row.normalized_id,
  caseNumber: row.case_number,
  title: row.title,
  summary: row.summary,
  grade: Number(row.grade),
  difficulty: Number(row.difficulty),
  episodes: Number(row.episodes),
  complexity: row.complexity,
  vocabulary: row.vocabulary,
  edbFocus: row.edb_focus,
  passages: {
    prosecution: {
      label: row.prosecution_label,
      speaker: row.prosecution_speaker,
      paragraphs: [row.prosecution_p1, row.prosecution_p2, row.prosecution_p3],
    },
    defence: {
      label: row.defence_label,
      speaker: row.defence_speaker,
      paragraphs: [row.defence_p1, row.defence_p2, row.defence_p3],
    },
  },
  questions: [1, 2, 3, 4, 5].map((number) => ({
    id: `${row.normalized_id}-q${number}`,
    construct: row[`q${number}_construct`],
    prompt: row[`q${number}_prompt`],
    options: [0, 1, 2, 3].map(
      (index) => row[`q${number}_option_${index}`],
    ),
    answer: Number(row[`q${number}_answer_index`]),
    generalCue: row[`q${number}_general_cue`],
    specificCue: row[`q${number}_specific_cue`],
    evidence: row[`q${number}_evidence_quote`],
  })),
}));

const generatedIdealJudgments = Object.fromEntries(
  rows.map((row) => [
    row.normalized_id,
    {
      finding: row.ideal_finding,
      punishment: row.ideal_punishment,
      severity: Number(row.ideal_severity),
      reasoning: row.ideal_reasoning,
    },
  ]),
);

const output = `import type { CourtCase, IdealJudgment } from "./case-library";

// Generated from a clinician-reviewed CSV. Re-run the import script for future batches.
export const generatedCases: CourtCase[] = ${JSON.stringify(generatedCases, null, 2)};

export const generatedIdealJudgments: Record<string, IdealJudgment> = ${JSON.stringify(generatedIdealJudgments, null, 2)};
`;

await writeFile(path.resolve(outputPath), output, "utf8");
console.log(
  `Imported ${rows.length} cases and ${rows.length * 5} questions to ${outputPath}.`,
);
