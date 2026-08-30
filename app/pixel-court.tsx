"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  caseLibrary as authoredCases,
  idealJudgments as authoredIdealJudgments,
} from "./case-library";
import { generatedCases, generatedIdealJudgments } from "./generated-cases";
import {
  generatedCases as generatedCases031To040,
  generatedIdealJudgments as generatedIdealJudgments031To040,
} from "./generated-cases-031-040";
import {
  expandedCases,
  expandedIdealJudgments,
} from "./expanded-case-bank";

const legacyCases = [...authoredCases, ...generatedCases, ...generatedCases031To040];
const allCases = [...legacyCases, ...expandedCases];
const allIdealJudgments = {
  ...authoredIdealJudgments,
  ...generatedIdealJudgments,
  ...generatedIdealJudgments031To040,
  ...expandedIdealJudgments,
};
const casesByGrade = ([1, 2, 3, 4, 5, 6] as const).reduce(
  (result, grade) => {
    result[grade] = allCases.filter((courtCase) => courtCase.grade === grade).slice(0, 30);
    return result;
  },
  {} as Record<1 | 2 | 3 | 4 | 5 | 6, typeof allCases>,
);
const caseLibrary = ([1, 2, 3, 4, 5, 6] as const).flatMap(
  (grade) => casesByGrade[grade],
);
const idealJudgments = allIdealJudgments;

type Screen =
  | "select"
  | "intro"
  | "reading"
  | "questions"
  | "verdict"
  | "result";
type Side = "prosecution" | "defence";
type Construct =
  | "factual"
  | "inferential"
  | "semantic"
  | "integration"
  | "evidence";
type CueLevel = 0 | 1 | 2;

type JudgeGender = "boy" | "girl";
type JudgeLookId = "amber" | "rose" | "walnut" | "midnight";
type JudgeOutfitId = "classic" | "crimson" | "night" | "gold";

type JudgeAvatar = {
  gender: JudgeGender;
  look: JudgeLookId;
  outfit: JudgeOutfitId;
};

type Character = {
  id: string;
  name: string;
  role: string;
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "wave" | "crop" | "bald" | "bun";
  outfit: string;
  accent: string;
  accessory?: "glasses" | "hat" | "earring" | "cane";
  gender?: JudgeGender;
};

type Question = {
  id: string;
  construct: Construct;
  prompt: string;
  options: string[];
  answer: number;
  generalCue: string;
  specificCue: string;
  evidence: string;
};

type QuestionRecord = {
  id: string;
  construct: Construct;
  correct: boolean;
  cueLevel: CueLevel | 3;
  latencyMs: number;
  reviews: number;
  optionChanges: number;
};

type PerformanceSummary = {
  accuracy: number;
  averageTimeSec: number;
  timeScore: number;
  helpScore: number;
  revisitScore: number;
  changeScore: number;
  composite: number;
  difficultyShift: -1 | 0 | 1;
};

type PresentedOptions = {
  options: string[];
  answer: number;
};

const constructMeta: Record<
  Construct,
  { label: string; short: string; color: string }
> = {
  factual: { label: "事實理解", short: "事實", color: "#65d3a8" },
  inferential: { label: "推論理解", short: "推論", color: "#ff7b5f" },
  semantic: { label: "語意理解", short: "語意", color: "#f6c85f" },
  integration: { label: "雙文整合", short: "整合", color: "#71b9ff" },
  evidence: { label: "證據判讀", short: "證據", color: "#c990ff" },
};

const initialMastery: Record<Construct, number> = {
  factual: 0.68,
  inferential: 0.39,
  semantic: 0.53,
  integration: 0.43,
  evidence: 0.46,
};

const defaultJudgeAvatar: JudgeAvatar = {
  gender: "boy",
  look: "amber",
  outfit: "classic",
};

const judgeLooks: {
  id: JudgeLookId;
  label: string;
  skin: string;
  hair: string;
}[] = [
  {
    id: "amber",
    label: "琥珀",
    skin: "#d99b72",
    hair: "#30231f",
  },
  {
    id: "rose",
    label: "玫瑰",
    skin: "#efb28c",
    hair: "#59362f",
  },
  {
    id: "walnut",
    label: "胡桃",
    skin: "#b96f4d",
    hair: "#201d21",
  },
  {
    id: "midnight",
    label: "夜墨",
    skin: "#82513e",
    hair: "#16171b",
  },
];

const judgeOutfits: {
  id: JudgeOutfitId;
  label: string;
  outfit: string;
  accent: string;
  minLevel: number;
}[] = [
  {
    id: "classic",
    label: "經典黑袍",
    outfit: "#202936",
    accent: "#d9c9aa",
    minLevel: 1,
  },
  {
    id: "crimson",
    label: "緋紅法袍",
    outfit: "#652f3f",
    accent: "#efc968",
    minLevel: 1,
  },
  {
    id: "night",
    label: "夜色法袍",
    outfit: "#263d62",
    accent: "#8fd4dd",
    minLevel: 2,
  },
  {
    id: "gold",
    label: "金徽法袍",
    outfit: "#72572a",
    accent: "#ffe39a",
    minLevel: 4,
  },
];

function makeJudgeCharacter(avatar: JudgeAvatar): Character {
  const look =
    judgeLooks.find((option) => option.id === avatar.look) ?? judgeLooks[0];
  const outfit =
    judgeOutfits.find((option) => option.id === avatar.outfit) ??
    judgeOutfits[0];
  return {
    id: "student-judge",
    name: "學生法官",
    role: "主審法官",
    skin: look.skin,
    hair: look.hair,
    hairStyle: avatar.gender === "girl" ? "long" : "short",
    outfit: outfit.outfit,
    accent: outfit.accent,
    gender: avatar.gender,
  };
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function calculatePerformance(
  records: QuestionRecord[],
  passageReviews: number,
): PerformanceSummary {
  const count = Math.max(records.length, 1);
  const accuracy =
    records.length > 0
      ? records.filter((record) => record.correct).length / records.length
      : 0;
  const averageTimeSec =
    records.length > 0
      ? records.reduce((total, record) => total + record.latencyMs, 0) /
        records.length /
        1000
      : 90;
  const timeScore = clampUnit(1 - Math.max(0, averageTimeSec - 25) / 65);
  const helpBurden =
    records.reduce(
      (total, record) => total + Math.min(record.cueLevel, 3) / 3,
      0,
    ) / count;
  const helpScore = 1 - clampUnit(helpBurden);
  const revisitScore = 1 - clampUnit(passageReviews / 4);
  const optionChanges =
    records.reduce((total, record) => total + record.optionChanges, 0) / count;
  const changeScore = 1 - clampUnit(optionChanges / 3);
  const composite = Math.round(
    100 *
      (accuracy * 0.45 +
        timeScore * 0.15 +
        helpScore * 0.2 +
        revisitScore * 0.1 +
        changeScore * 0.1),
  );
  const difficultyShift: -1 | 0 | 1 =
    composite >= 80 ? 1 : composite <= 50 ? -1 : 0;
  return {
    accuracy,
    averageTimeSec: Math.round(averageTimeSec),
    timeScore,
    helpScore,
    revisitScore,
    changeScore,
    composite,
    difficultyShift,
  };
}

const characters: Character[] = [
  {
    id: "clerk",
    name: "書記官 阿琦",
    role: "法庭書記",
    skin: "#d99b72",
    hair: "#35251f",
    hairStyle: "bun",
    outfit: "#315a6b",
    accent: "#f0b85a",
    accessory: "glasses",
  },
  {
    id: "prosecutor",
    name: "控方代表 何律師",
    role: "控方代表",
    skin: "#c97d55",
    hair: "#242126",
    hairStyle: "short",
    outfit: "#582c3d",
    accent: "#e9d7b3",
  },
  {
    id: "defender",
    name: "辯方代表 梁律師",
    role: "辯方代表",
    skin: "#e3aa7e",
    hair: "#4b2f28",
    hairStyle: "wave",
    outfit: "#254c49",
    accent: "#d9c376",
    accessory: "earring",
  },
  {
    id: "shopkeeper",
    name: "店主 陳女士",
    role: "申訴人",
    skin: "#df9f78",
    hair: "#56372b",
    hairStyle: "long",
    outfit: "#8b4c3e",
    accent: "#f0cf65",
    accessory: "glasses",
  },
  {
    id: "father",
    name: "王志明",
    role: "被告",
    skin: "#b96f4d",
    hair: "#2f2927",
    hairStyle: "crop",
    outfit: "#3d5c7d",
    accent: "#d98558",
  },
  {
    id: "inspector",
    name: "調查員 莫先生",
    role: "調查員",
    skin: "#ca875c",
    hair: "#1e2023",
    hairStyle: "short",
    outfit: "#3f5265",
    accent: "#a9bdc9",
    accessory: "hat",
  },
  {
    id: "r06",
    name: "周美蓮",
    role: "社區居民",
    skin: "#e1a47b",
    hair: "#3e2926",
    hairStyle: "bun",
    outfit: "#7a4666",
    accent: "#e7b85d",
  },
  {
    id: "r07",
    name: "范國豪",
    role: "巴士司機",
    skin: "#a95f43",
    hair: "#202327",
    hairStyle: "crop",
    outfit: "#315e52",
    accent: "#d2c576",
    accessory: "glasses",
  },
  {
    id: "r08",
    name: "郭慧儀",
    role: "圖書館員",
    skin: "#d18a67",
    hair: "#7d4c35",
    hairStyle: "wave",
    outfit: "#465587",
    accent: "#e5d6b2",
    accessory: "earring",
  },
  {
    id: "r09",
    name: "麥志安",
    role: "維修員",
    skin: "#b66e50",
    hair: "#292421",
    hairStyle: "bald",
    outfit: "#815d35",
    accent: "#f0a849",
  },
  {
    id: "r10",
    name: "許雅雯",
    role: "花店店員",
    skin: "#e6aa82",
    hair: "#452b2e",
    hairStyle: "long",
    outfit: "#4e765d",
    accent: "#ef8f82",
  },
  {
    id: "r11",
    name: "黎兆康",
    role: "退休教師",
    skin: "#c48261",
    hair: "#cbc2ae",
    hairStyle: "short",
    outfit: "#5d4b67",
    accent: "#d9b65a",
    accessory: "cane",
  },
  {
    id: "r12",
    name: "司徒敏",
    role: "餐廳經理",
    skin: "#8f563d",
    hair: "#211f22",
    hairStyle: "bun",
    outfit: "#713f4d",
    accent: "#f2cf72",
  },
  {
    id: "r13",
    name: "何振聲",
    role: "音樂人",
    skin: "#d19370",
    hair: "#50362a",
    hairStyle: "long",
    outfit: "#354263",
    accent: "#d46c59",
    accessory: "glasses",
  },
  {
    id: "r14",
    name: "潘雪玲",
    role: "護士",
    skin: "#ebb58e",
    hair: "#55352c",
    hairStyle: "short",
    outfit: "#d7e1da",
    accent: "#4e998a",
  },
  {
    id: "r15",
    name: "文偉明",
    role: "街市檔主",
    skin: "#a96748",
    hair: "#26221f",
    hairStyle: "crop",
    outfit: "#744b35",
    accent: "#e9b557",
  },
  {
    id: "r16",
    name: "鄭紫晴",
    role: "設計師",
    skin: "#d58d69",
    hair: "#8c5538",
    hairStyle: "wave",
    outfit: "#4e416f",
    accent: "#e98070",
    accessory: "earring",
  },
  {
    id: "r17",
    name: "韓柏林",
    role: "廚師",
    skin: "#c07958",
    hair: "#39302b",
    hairStyle: "bald",
    outfit: "#eee2c4",
    accent: "#b54742",
    accessory: "hat",
  },
  {
    id: "r18",
    name: "余麗芳",
    role: "社工",
    skin: "#b87355",
    hair: "#29262b",
    hairStyle: "bun",
    outfit: "#3c6d70",
    accent: "#f1c75b",
    accessory: "glasses",
  },
  {
    id: "r19",
    name: "張兆峰",
    role: "速遞員",
    skin: "#e0a077",
    hair: "#493027",
    hairStyle: "short",
    outfit: "#7c513b",
    accent: "#efad4d",
  },
  {
    id: "r20",
    name: "袁心怡",
    role: "獸醫",
    skin: "#d98e68",
    hair: "#2b2425",
    hairStyle: "long",
    outfit: "#386052",
    accent: "#d9e1c8",
  },
  {
    id: "r21",
    name: "蘇啟明",
    role: "看更",
    skin: "#9d5c43",
    hair: "#d1c5ac",
    hairStyle: "crop",
    outfit: "#344b62",
    accent: "#91aab8",
    accessory: "cane",
  },
  {
    id: "r22",
    name: "謝嘉琪",
    role: "記者",
    skin: "#e7ad83",
    hair: "#6d3f31",
    hairStyle: "wave",
    outfit: "#61445d",
    accent: "#e6be5b",
  },
  {
    id: "r23",
    name: "杜文傑",
    role: "工程師",
    skin: "#b66c4b",
    hair: "#272327",
    hairStyle: "short",
    outfit: "#4b5967",
    accent: "#d16b50",
    accessory: "glasses",
  },
  {
    id: "r24",
    name: "羅淑華",
    role: "麵包師",
    skin: "#d79069",
    hair: "#4a3029",
    hairStyle: "bun",
    outfit: "#705443",
    accent: "#f1d79c",
    accessory: "hat",
  },
];

const questionBank: Question[] = [
  {
    id: "f1",
    construct: "factual",
    prompt: "陳女士在甚麼時間發現麵包不見了？",
    options: ["上午七時五十分", "晚上七時五十分", "晚上八時五十分", "第二天早上"],
    answer: 1,
    generalCue: "時間在控方第一段開頭。",
    specificCue: "尋找「距離關門只有十分鐘」前面的時間。",
    evidence: "上星期五晚上七時五十分。",
  },
  {
    id: "f2",
    construct: "factual",
    prompt: "王志明第二天帶了甚麼回到店外？",
    options: ["新的麵包", "一張收據", "足夠付款的錢", "一個新的銀包"],
    answer: 2,
    generalCue: "重看辯方最後一段。",
    specificCue: "留意他領到工資後想完成甚麼事情。",
    evidence: "並帶了足夠的錢。",
  },
  {
    id: "i1",
    construct: "inferential",
    prompt: "王志明留下姓名和電話，最可能想表示甚麼？",
    options: ["他想應徵工作", "他有意日後付款", "他想投訴店主", "他想預訂麵包"],
    answer: 1,
    generalCue: "想一想留下聯絡方法與第二天回來有甚麼關係。",
    specificCue: "他希望店主可以找到他，讓他完成付款。",
    evidence: "希望第二天領到工資後回來付款。",
  },
  {
    id: "i2",
    construct: "inferential",
    prompt: "陳女士說「小店便很難經營下去」，她主要擔心甚麼？",
    options: ["店舖太早關門", "所有麵包味道相同", "未付款取貨會造成損失", "服務鈴的聲音太小"],
    answer: 2,
    generalCue: "把她的擔心和店舖收入連起來想。",
    specificCue: "貨品被取走卻收不到錢，會影響小店營運。",
    evidence: "店舖不能容許任何人未經同意取走貨品。",
  },
  {
    id: "i3",
    construct: "inferential",
    prompt: "王志明第二天比店主更早到達，這個行動最能反映甚麼？",
    options: ["他想再次取走麵包", "他想躲避責任", "他希望盡快處理事件", "他不知道店舖位置"],
    answer: 2,
    generalCue: "想一想主動回到現場通常代表甚麼態度。",
    specificCue: "他帶錢回來，而且沒有等待店主尋找他。",
    evidence: "翌日早上，我比店主更早到達店外。",
  },
  {
    id: "s1",
    construct: "semantic",
    prompt: "辯方所說的「迫不得已」最接近哪個意思？",
    options: ["非常高興地選擇", "沒有其他辦法而勉強去做", "完全不知道發生甚麼", "故意欺騙別人"],
    answer: 1,
    generalCue: "根據他遺失銀包和孩子肚餓的情況推想。",
    specificCue: "這個詞語形容因為處境困難而覺得沒有其他選擇。",
    evidence: "但當時我感到迫不得已。",
  },
  {
    id: "s2",
    construct: "semantic",
    prompt: "控方所說的「容許」在文中是甚麼意思？",
    options: ["允許", "責罵", "隱瞞", "尋找"],
    answer: 0,
    generalCue: "把「不能容許」換成意思相近的詞語。",
    specificCue: "店主表示這種行為是不可以被接受的。",
    evidence: "店舖不能容許任何人未經同意取走貨品。",
  },
  {
    id: "x1",
    construct: "integration",
    prompt: "以下哪件事是控辯雙方都同意的？",
    options: ["王志明按過服務鈴", "王志明當晚沒有付款", "店主拒絕提供食物", "紙條一直放在收據盒下"],
    answer: 1,
    generalCue: "分別查看兩篇陳詞提到付款的部分。",
    specificCue: "控方說收銀機沒有交易；辯方也承認未付款。",
    evidence: "收銀機沒有這項交易／我知道不付款便取走麵包是不對的。",
  },
  {
    id: "x2",
    construct: "integration",
    prompt: "雙方對哪一件事的說法最不一致？",
    options: ["麵包是否全麥", "事件發生的星期", "王志明是否曾嘗試找店員", "王志明翌日是否回來"],
    answer: 2,
    generalCue: "比較控方第二段和辯方第二段。",
    specificCue: "一方說他沒有找店主；另一方說自己曾等候和呼叫。",
    evidence: "沒有走到儲物室找我／我在櫃枱前等了一會兒，也叫了兩聲。",
  },
  {
    id: "e1",
    construct: "evidence",
    prompt: "哪項資料最能支持王志明「沒有打算逃避責任」的說法？",
    options: ["孩子說肚子餓", "麵包是全麥的", "他翌日帶錢主動回來", "店主曾到儲物室"],
    answer: 2,
    generalCue: "選擇一個可以觀察到的行動，而不是人物的感受。",
    specificCue: "主動帶錢返回店舖，是最直接的行動證據。",
    evidence: "翌日早上，我比店主更早到達店外，並帶了足夠的錢。",
  },
  {
    id: "e2",
    construct: "evidence",
    prompt: "關於王志明是否曾呼叫店員，目前最合理的判斷是甚麼？",
    options: ["一定有，因為他這樣說", "一定沒有，因為店主沒聽見", "雙方說法不同，證據不足", "閉路電視一定錄到聲音"],
    answer: 2,
    generalCue: "人物的說法不一定等於已證實的事實。",
    specificCue: "一方說曾叫人，另一方沒有聽見；文中沒有其他證據確認。",
    evidence: "我在櫃枱前等了一會兒，也叫了兩聲／沒有走到儲物室找我。",
  },
  {
    id: "e3",
    construct: "evidence",
    prompt: "如果要更清楚判斷紙條何時被留下，最需要哪項額外資料？",
    options: ["麵包的成分", "紙條或櫃枱的完整錄影", "孩子喜歡的食物", "店舖開門時間"],
    answer: 1,
    generalCue: "想一想哪種資料可以直接顯示紙條被放下的時間。",
    specificCue: "完整的影像可以顯示誰在何時放下紙條。",
    evidence: "店主後來找到紙條，但文章沒有獨立資料證明留下的時間。",
  },
];

const findings = [
  { id: "guilty", label: "罪成", sub: "行為獲證實" },
  { id: "not-guilty", label: "罪名不成立", sub: "證據不能支持指控" },
  { id: "insufficient", label: "證據不足", sub: "仍有重要疑點" },
  { id: "shared", label: "部分責任", sub: "雙方均有責任" },
];

const punishments = [
  { id: "none", label: "無需處分", icon: "○" },
  { id: "warning", label: "正式警告", icon: "!" },
  { id: "compensation", label: "賠償受影響一方", icon: "$" },
  { id: "fine", label: "罰款", icon: "¢" },
  { id: "service", label: "社會服務令", icon: "✦" },
  { id: "custody", label: "監禁", icon: "▥" },
];

const punishmentSeverity: Record<string, number> = {
  none: 0,
  warning: 1,
  compensation: 2,
  fine: 3,
  service: 3,
  custody: 5,
};

function findingDistance(selected: string, ideal: string) {
  if (selected === ideal) return 0;
  const adjacentPairs = [
    ["guilty", "shared"],
    ["shared", "insufficient"],
    ["insufficient", "not-guilty"],
  ];
  return adjacentPairs.some(
    ([left, right]) =>
      (selected === left && ideal === right) ||
      (selected === right && ideal === left),
  )
    ? 1
    : 2;
}

function selectNextQuestion(
  used: string[],
  records: QuestionRecord[],
  mastery: Record<Construct, number>,
  questionPool: Question[] = questionBank,
) {
  const counts = records.reduce<Record<Construct, number>>(
    (summary, record) => {
      summary[record.construct] += 1;
      return summary;
    },
    { factual: 0, inferential: 0, semantic: 0, integration: 0, evidence: 0 },
  );
  const available = questionPool.filter(
    (question) =>
      !used.includes(question.id) && counts[question.construct] < 2,
  );
  if (!available.length) return null;
  const target = (Object.keys(mastery) as Construct[])
    .filter((construct) => counts[construct] < 2)
    .sort(
      (a, b) =>
        mastery[a] + counts[a] * 0.14 - (mastery[b] + counts[b] * 0.14),
    )[0];
  return (
    available.find((question) => question.construct === target) ?? available[0]
  );
}

function shuffleOptions(
  question: Question,
  previousOptions: string[] = question.options,
): PresentedOptions {
  const indexed = question.options.map((option, index) => ({ option, index }));
  for (let index = indexed.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexed[index], indexed[swapIndex]] = [indexed[swapIndex], indexed[index]];
  }
  if (
    indexed.length > 1 &&
    indexed.every((item, index) => item.option === previousOptions[index])
  ) {
    indexed.push(indexed.shift()!);
  }
  return {
    options: indexed.map((item) => item.option),
    answer: indexed.findIndex((item) => item.index === question.answer),
  };
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-HK";
  utterance.rate = 0.86;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((item) => item.lang.toLowerCase() === "zh-hk") ??
    voices.find((item) => item.lang.toLowerCase().startsWith("zh"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

function playTone(kind: "click" | "success" | "gavel" = "click") {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  oscillator.type = kind === "gavel" ? "square" : "sine";
  oscillator.frequency.setValueAtTime(
    kind === "success" ? 660 : kind === "gavel" ? 105 : 330,
    now,
  );
  if (kind === "success") oscillator.frequency.linearRampToValueAtTime(880, now + 0.12);
  gain.gain.setValueAtTime(kind === "gavel" ? 0.16 : 0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === "gavel" ? 0.24 : 0.16));
  oscillator.start(now);
  oscillator.stop(now + (kind === "gavel" ? 0.25 : 0.17));
}

function CharacterSprite({
  character,
  pose = "idle",
  size = "normal",
}: {
  character: Character;
  pose?: "idle" | "talk" | "enter" | "react" | "sad" | "cry" | "celebrate";
  size?: "small" | "normal" | "large";
}) {
  return (
    <div
      className={`pixel-person ${pose} ${size} gender-${character.gender ?? "boy"}`}
      style={
        {
          "--skin": character.skin,
          "--hair": character.hair,
          "--outfit": character.outfit,
          "--accent": character.accent,
        } as React.CSSProperties
      }
      title={`${character.name}｜${character.role}`}
    >
      <div className={`pixel-hair ${character.hairStyle}`} />
      <div className="pixel-head">
        <i className="eye left" />
        <i className="eye right" />
        <i className="mouth" />
        {pose === "cry" && (
          <>
            <i className="tear left" />
            <i className="tear right" />
          </>
        )}
        {character.accessory === "glasses" && <i className="glasses" />}
        {character.accessory === "earring" && <i className="earring" />}
      </div>
      {character.accessory === "hat" && <div className="pixel-hat" />}
      <div className="pixel-neck" />
      <div className="pixel-body">
        <i className="lapel left" />
        <i className="lapel right" />
      </div>
      <div className="pixel-arm left" />
      <div className="pixel-arm right" />
      <div className="pixel-legs">
        <i />
        <i />
      </div>
      {character.accessory === "cane" && <div className="pixel-cane" />}
      <div className="pixel-shadow" />
    </div>
  );
}

function Courtroom({
  activeSide,
  screen,
  verdictReaction,
  judgeCharacter,
}: {
  activeSide: Side;
  screen: Screen;
  verdictReaction:
    | "none"
    | "defence-loses"
    | "prosecution-loses"
    | "both-sad"
    | "uncertain";
  judgeCharacter: Character;
}) {
  const activeTalk =
    screen === "reading"
      ? activeSide === "prosecution"
        ? "shopkeeper"
        : "father"
      : screen === "intro"
        ? "clerk"
        : "";

  return (
    <div className={`courtroom court-${screen}`} aria-hidden="true">
      <div className="rain-window left">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="rain-window right">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="court-curtain curtain-left" />
      <div className="court-curtain curtain-right" />
      <div className="court-emblem">
        <span>判</span>
      </div>
      <div className="court-clock">
        <i />
        <b />
      </div>
      <div className="gallery gallery-left">
        {characters.slice(6, 10).map((character) => (
          <CharacterSprite key={character.id} character={character} size="small" />
        ))}
      </div>
      <div className="gallery gallery-right">
        {characters.slice(10, 14).map((character) => (
          <CharacterSprite key={character.id} character={character} size="small" />
        ))}
      </div>
      <div className="gallery-rail" />
      <div className="court-side prosecution-side">
        <CharacterSprite
          character={characters[1]}
          pose={
            screen === "intro"
              ? "enter"
              : verdictReaction === "prosecution-loses" ||
                  verdictReaction === "both-sad"
                ? "sad"
                : verdictReaction === "defence-loses"
                  ? "celebrate"
                  : "idle"
          }
        />
        <CharacterSprite
          character={characters[3]}
          pose={
            verdictReaction === "prosecution-loses"
              ? "cry"
              : verdictReaction === "both-sad"
                ? "sad"
                : verdictReaction === "defence-loses"
                  ? "celebrate"
                  : activeTalk === "shopkeeper"
                    ? "talk"
                    : "idle"
          }
        />
      </div>
      <div className="court-side defence-side">
        <CharacterSprite
          character={characters[2]}
          pose={
            screen === "intro"
              ? "enter"
              : verdictReaction === "defence-loses" ||
                  verdictReaction === "both-sad"
                ? "sad"
                : verdictReaction === "prosecution-loses"
                  ? "celebrate"
                  : "idle"
          }
        />
        <CharacterSprite
          character={characters[4]}
          pose={
            verdictReaction === "defence-loses"
              ? "cry"
              : verdictReaction === "both-sad"
                ? "sad"
                : verdictReaction === "prosecution-loses"
                  ? "celebrate"
                  : activeTalk === "father"
                    ? "talk"
                    : "idle"
          }
        />
      </div>
      <div className="clerk-stand">
        <CharacterSprite
          character={characters[0]}
          pose={activeTalk === "clerk" ? "talk" : "idle"}
          size="small"
        />
      </div>
      <div className="judge-platform">
        <div className="player-judge">
          <CharacterSprite
            character={judgeCharacter}
            pose={screen === "result" ? "celebrate" : "idle"}
            size="small"
          />
        </div>
        <div className="judge-chair" />
        <div className="judge-bench">
          <div className="gavel">
            <i />
            <b />
          </div>
          <span>JUDGE</span>
        </div>
      </div>
      <div className="court-floor" />
    </div>
  );
}

export function PixelCourt() {
  const [screen, setScreen] = useState<Screen>("select");
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 5 | 6>(3);
  const [activeCaseId, setActiveCaseId] = useState("g3-01");
  const [activeSide, setActiveSide] = useState<Side>("prosecution");
  const [openedSides, setOpenedSides] = useState<Side[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [ttsCount, setTtsCount] = useState(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [passageSwitches, setPassageSwitches] = useState(0);
  const [passageReviews, setPassageReviews] = useState(0);
  const [slpHelp, setSlpHelp] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mastery, setMastery] =
    useState<Record<Construct, number>>(initialMastery);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [records, setRecords] = useState<QuestionRecord[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [presentedOptions, setPresentedOptions] = useState<string[]>([]);
  const [presentedAnswer, setPresentedAnswer] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [cueLevel, setCueLevel] = useState<CueLevel>(0);
  const [questionFeedback, setQuestionFeedback] = useState<
    "idle" | "retry" | "correct" | "incorrect"
  >("idle");
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [questionReviews, setQuestionReviews] = useState(0);
  const [optionChanges, setOptionChanges] = useState(0);
  const [finding, setFinding] = useState("");
  const [punishment, setPunishment] = useState("");
  const [judgment, setJudgment] = useState("");
  const readerRef = useRef<HTMLDivElement | null>(null);
  const gradeCases = casesByGrade[selectedGrade];
  const currentCase =
    caseLibrary.find((courtCase) => courtCase.id === activeCaseId) ??
    gradeCases[0] ?? caseLibrary[0];
  const casePassages = currentCase.passages;
  const judgeCharacter = useMemo(
    () => makeJudgeCharacter(defaultJudgeAvatar),
    [],
  );

  const currentProgress =
    screen === "reading"
      ? 2
      : screen === "questions"
        ? 3
        : screen === "verdict"
          ? 4
          : screen === "result"
            ? 5
            : screen === "intro"
              ? 1
              : 0;

  const independentCorrect = records.filter(
    (record) => record.correct && record.cueLevel === 0,
  ).length;
  const idealJudgment = idealJudgments[currentCase.id];
  const selectedSeverity = punishmentSeverity[punishment] ?? 0;
  const severityDelta = selectedSeverity - idealJudgment.severity;
  const findingScore = finding
    ? Math.max(0, 100 - findingDistance(finding, idealJudgment.finding) * 32)
    : 0;
  const punishmentScore = punishment
    ? Math.max(
        0,
        100 -
          Math.abs(severityDelta) * 22 -
          (punishment === idealJudgment.punishment ? 0 : 12),
      )
    : 0;
  const judgmentCloseness = finding && punishment
    ? Math.round(findingScore * 0.58 + punishmentScore * 0.42)
    : 0;
  const judgmentGrade =
    judgmentCloseness >= 90
      ? "A｜非常接近"
      : judgmentCloseness >= 75
        ? "B｜接近公平判決"
        : judgmentCloseness >= 60
          ? "C｜仍可調整"
          : judgmentCloseness > 0
            ? "D｜需要重新檢視證據"
            : "—";
  const performance = calculatePerformance(records, passageReviews);
  const verdictReaction =
    screen !== "result"
      ? "none"
      : finding === "guilty"
        ? "defence-loses"
        : finding === "not-guilty"
          ? "prosecution-loses"
          : finding === "shared"
            ? "both-sad"
            : "uncertain";
  const selectedFindingLabel =
    findings.find((item) => item.id === finding)?.label ?? "未選擇";
  const selectedPunishmentLabel =
    punishments.find((item) => item.id === punishment)?.label ?? "未選擇";
  const idealFindingLabel =
    findings.find((item) => item.id === idealJudgment.finding)?.label ??
    idealJudgment.finding;
  const idealPunishmentLabel =
    punishments.find((item) => item.id === idealJudgment.punishment)?.label ??
    idealJudgment.punishment;
  const judgmentDirection =
    severityDelta >= 1
      ? "harsh"
      : severityDelta <= -1
        ? "lenient"
        : judgmentCloseness >= 85
          ? "balanced"
          : "different";
  useEffect(() => {
    if (screen === "questions" && !currentQuestion && records.length < 5) {
      const timer = window.setTimeout(() => {
        const next = selectNextQuestion(
          usedQuestions,
          records,
          mastery,
          currentCase.questions,
        );
        if (next) {
          const presentation = shuffleOptions(next);
          setCurrentQuestion(next);
          setPresentedOptions(presentation.options);
          setPresentedAnswer(presentation.answer);
          setUsedQuestions((used) => [...used, next.id]);
          setQuestionStartedAt(Date.now());
        }
      }, 0);
      return () => window.clearTimeout(timer);
    } else if (screen === "questions" && records.length >= 5) {
      const timer = window.setTimeout(() => setScreen("verdict"), 0);
      return () => window.clearTimeout(timer);
    }
  }, [
    screen,
    currentQuestion,
    records,
    usedQuestions,
    mastery,
    currentCase.questions,
  ]);

  function resetGame() {
    window.speechSynthesis?.cancel();
    setScreen("select");
    setActiveCaseId(casesByGrade[selectedGrade][0]?.id ?? "g3-01");
    setActiveSide("prosecution");
    setOpenedSides([]);
    setSelectedText("");
    setTtsCount(0);
    setPassageSwitches(0);
    setPassageReviews(0);
    setSlpHelp(0);
    setMastery({ ...initialMastery });
    setUsedQuestions([]);
    setRecords([]);
    setCurrentQuestion(null);
    setPresentedOptions([]);
    setPresentedAnswer(null);
    setSelectedAnswer(null);
    setCueLevel(0);
    setQuestionFeedback("idle");
    setQuestionStartedAt(0);
    setOptionChanges(0);
    setFinding("");
    setPunishment("");
    setJudgment("");
    setInspectorOpen(false);
  }

  function chooseGrade(grade: 1 | 2 | 3 | 4 | 5 | 6) {
    setSelectedGrade(grade);
    setActiveCaseId(casesByGrade[grade][0]?.id ?? "g3-01");
    setScreen("select");
    setFinding("");
    setPunishment("");
    setJudgment("");
    playTone();
  }

  function chooseCase(caseId: string) {
    setActiveCaseId(caseId);
    setFinding("");
    setPunishment("");
    setJudgment("");
    playTone();
  }

  function startSelectedCase() {
    playTone("gavel");
    setScreen("intro");
  }

  function openPassage(side: Side) {
    playTone();
    if (side !== activeSide) setPassageSwitches((count) => count + 1);
    setActiveSide(side);
    setOpenedSides((opened) =>
      opened.includes(side) ? opened : [...opened, side],
    );
    setSelectedText("");
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    window.setTimeout(() => readerRef.current?.scrollTo({ top: 0 }), 30);
  }

  function captureSelection() {
    window.setTimeout(() => {
      const selection = window.getSelection()?.toString().trim() ?? "";
      if (selection && selection.length <= 80) setSelectedText(selection);
    }, 30);
  }

  function readSelection() {
    if (!selectedText) return;
    setTtsPlaying(true);
    setTtsCount((count) => count + 1);
    speak(selectedText, () => setTtsPlaying(false));
  }

  function submitQuestion() {
    if (
      selectedAnswer === null ||
      presentedAnswer === null ||
      !currentQuestion ||
      questionFeedback !== "idle"
    )
      return;
    const correct = selectedAnswer === presentedAnswer;
    if (correct) {
      const gain = cueLevel === 0 ? 0.08 : cueLevel === 1 ? 0.04 : 0.018;
      setMastery((state) => ({
        ...state,
        [currentQuestion.construct]: Math.min(
          0.95,
          state[currentQuestion.construct] + gain,
        ),
      }));
      setQuestionFeedback("correct");
      playTone("success");
      window.setTimeout(() => finishQuestion(true, cueLevel), 900);
      return;
    }
    setMastery((state) => ({
      ...state,
      [currentQuestion.construct]: Math.max(
        0.1,
        state[currentQuestion.construct] - (cueLevel === 0 ? 0.04 : 0.025),
      ),
    }));
    if (cueLevel < 2) {
      setQuestionFeedback("retry");
      playTone();
    } else {
      setQuestionFeedback("incorrect");
      window.setTimeout(() => finishQuestion(false, 3), 1450);
    }
  }

  function showNextCue() {
    if (currentQuestion) {
      const presentation = shuffleOptions(currentQuestion, presentedOptions);
      setPresentedOptions(presentation.options);
      setPresentedAnswer(presentation.answer);
    }
    setCueLevel((level) => Math.min(2, level + 1) as CueLevel);
    setSelectedAnswer(null);
    setQuestionFeedback("idle");
  }

  function finishQuestion(correct: boolean, finalCue: CueLevel | 3) {
    if (!currentQuestion) return;
    setRecords((items) => [
      ...items,
      {
        id: currentQuestion.id,
        construct: currentQuestion.construct,
        correct,
        cueLevel: finalCue,
        latencyMs: Date.now() - questionStartedAt,
        reviews: questionReviews,
        optionChanges,
      },
    ]);
    setCurrentQuestion(null);
    setPresentedOptions([]);
    setPresentedAnswer(null);
    setSelectedAnswer(null);
    setCueLevel(0);
    setQuestionFeedback("idle");
    setQuestionReviews(0);
    setOptionChanges(0);
    setReviewOpen(false);
  }

  function stampVerdict() {
    if (!finding || !punishment || !judgment.trim()) return;
    playTone("gavel");
    const result = {
      finding,
      punishment,
      judgment,
      records,
      ttsCount,
      passageSwitches,
      passageReviews,
      slpHelp,
      caseId: currentCase.id,
      grade: selectedGrade,
      idealJudgment,
      judgmentCloseness,
      judgmentGrade,
      performance,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("pixel-court-last-case", JSON.stringify(result));
    setScreen("result");
  }

  return (
    <main className={`game-shell screen-${screen}`}>
      <Courtroom
        activeSide={activeSide}
        screen={screen}
        verdictReaction={verdictReaction}
        judgeCharacter={judgeCharacter}
      />

      <header className="game-hud">
        <button
          className="court-brand"
          onClick={resetGame}
          aria-label="返回案件大廳"
        >
          <span>判</span>
          <div>
            <strong>判讀法庭</strong>
            <small>PIXEL COURT</small>
          </div>
        </button>

        {currentProgress > 0 && (
          <div className="case-hud">
            <span>CASE {currentCase.caseNumber}</span>
            <strong>{currentCase.title}</strong>
            <div className="case-pips">
              {[1, 2, 3, 4, 5].map((step) => (
                <i key={step} className={step <= currentProgress ? "on" : ""} />
              ))}
            </div>
          </div>
        )}

      </header>

      {screen === "select" && (
        <section className="case-select-stage">
          <div className="case-select-hero">
            <p className="pixel-kicker">PIXEL COURT // CASE ARCHIVE</p>
            <h1>選擇年級，<span>挑一宗案件。</span></h1>
            <p>先按你的閱讀年級，再從 30 宗獨立案件中選擇。每宗案件都要閱讀控方與辯方陳詞，完成五項證據挑戰，最後作出判決。</p>
          </div>
          <div className="grade-deck" aria-label="選擇年級">
            {([1, 2, 3, 4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                className={selectedGrade === grade ? "selected" : ""}
                onClick={() => chooseGrade(grade)}
              >
                <span>P.{grade}</span>
                <small>{casesByGrade[grade].length} 宗案件</small>
              </button>
            ))}
          </div>
          <div className="case-select-heading">
            <div>
              <p className="pixel-kicker">P.{selectedGrade} CASE BOARD</p>
              <h2>選擇案件</h2>
            </div>
            <span>本級 {gradeCases.length} / 30 宗</span>
          </div>
          <div className="case-card-grid">
            {gradeCases.map((courtCase, index) => (
              <button
                key={courtCase.id}
                className={`case-card ${activeCaseId === courtCase.id ? "selected" : ""}`}
                onClick={() => chooseCase(courtCase.id)}
              >
                <span className="case-card-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{courtCase.title}</strong>
                  <p>{courtCase.summary}</p>
                </div>
                <small>{courtCase.complexity}</small>
              </button>
            ))}
          </div>
          <div className="selected-case-bar">
            <div>
              <span>已選案件 · CASE {currentCase.caseNumber}</span>
              <strong>{currentCase.title}</strong>
              <p>{currentCase.summary}</p>
            </div>
            <button className="pixel-button gold" onClick={startSelectedCase}>
              <span>▶</span> 開始審訊
            </button>
          </div>
        </section>
      )}

      {screen === "intro" && (
        <section className="intro-screen">
          <div className="court-dialogue">
            <div className="speaker-portrait">
              <CharacterSprite character={characters[0]} size="large" pose="talk" />
            </div>
            <div>
              <p className="pixel-kicker">書記官 阿琦</p>
              <h2>
                全體肅立！案件 {currentCase.caseNumber} 現在開庭。
              </h2>
              <p>
                法官閣下，請閱讀雙方陳詞。五項證據挑戰之後，由你作出裁決。
              </p>
              <button
                className="pixel-button gold"
                onClick={() => {
                  openPassage("prosecution");
                  setScreen("reading");
                }}
              >
                開啟案件卷宗 <span>→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "reading" && (
        <section className="reader-stage">
          <div className="argument-banner">
            <span>{activeSide === "prosecution" ? "控方發言" : "辯方發言"}</span>
            <strong>CASE {currentCase.caseNumber} · {currentCase.title}</strong>
          </div>
          <div className="reader-window">
            <div className="reader-tabs">
              {(["prosecution", "defence"] as Side[]).map((side) => (
                <button
                  key={side}
                  className={activeSide === side ? "active" : ""}
                  onClick={() => openPassage(side)}
                >
                  <span>{side === "prosecution" ? "A" : "B"}</span>
                  {casePassages[side].label}
                  {openedSides.includes(side) && <i>✓</i>}
                </button>
              ))}
            </div>
            <div
              className="passage-paper"
              ref={readerRef}
              onPointerUp={captureSelection}
              onTouchEnd={captureSelection}
            >
              <div className="passage-heading">
                <div>
                  <small>{casePassages[activeSide].label}</small>
                  <h2>{casePassages[activeSide].speaker}</h2>
                </div>
                <span>PAGE {activeSide === "prosecution" ? "1" : "2"} / 2</span>
              </div>
              {casePassages[activeSide].paragraphs.map((paragraph, index) => (
                <p key={paragraph}>
                  <span>{index + 1}</span>
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="reader-controls">
              <div className="selection-status">
                <span className={selectedText ? "selected" : ""}>
                  {selectedText
                    ? `已選取：「${selectedText.slice(0, 20)}${selectedText.length > 20 ? "…" : ""}」`
                    : "用手指選取不明白的字詞"}
                </span>
                <button
                  onClick={readSelection}
                  disabled={!selectedText}
                  className={ttsPlaying ? "speaking" : ""}
                >
                  {ttsPlaying ? "▮▮ 朗讀中" : "▶ 朗讀選取內容"}
                </button>
              </div>
              <button
                className="slp-help-button"
                onClick={() => {
                  setSlpHelp((count) => count + 1);
                  setInspectorOpen(true);
                }}
              >
                呼叫 SLP
              </button>
              <button
                className="pixel-button gold"
                disabled={openedSides.length < 2}
                onClick={() => {
                  setScreen("questions");
                  playTone();
                }}
              >
                接受證據挑戰 <span>→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "questions" && currentQuestion && (
        <section className="challenge-stage">
          <div className="challenge-hud">
            <div>
              <p className="pixel-kicker">EVIDENCE CHALLENGE</p>
              <strong>挑戰 {records.length + 1} / 5</strong>
            </div>
            <div className="challenge-pips">
              {[0, 1, 2, 3, 4].map((index) => (
                <i
                  key={index}
                  className={
                    index < records.length
                      ? records[index].correct
                        ? "won"
                        : "lost"
                      : index === records.length
                        ? "current"
                        : ""
                  }
                />
              ))}
            </div>
            <button
              onClick={() => {
                setReviewOpen(true);
                setQuestionReviews((count) => count + 1);
                setPassageReviews((count) => count + 1);
              }}
            >
              ◫ 重看雙方陳詞
            </button>
          </div>

          <div className="challenge-box">
            <div
              className="construct-chip"
              style={{ color: constructMeta[currentQuestion.construct].color }}
            >
              <span
                style={{ background: constructMeta[currentQuestion.construct].color }}
              />
              {constructMeta[currentQuestion.construct].label}
            </div>
            <h2>{currentQuestion.prompt}</h2>

            {cueLevel > 0 && questionFeedback === "idle" && (
              <div className={`clerk-cue cue-${cueLevel}`}>
                <CharacterSprite character={characters[0]} size="small" pose="talk" />
                <div>
                  <strong>{cueLevel === 1 ? "書記官提示" : "證據位置提示"}</strong>
                      <p>
                        {cueLevel === 1
                          ? currentQuestion.generalCue
                          : currentQuestion.specificCue}
                      </p>
                      <small>選項已重新排列，請再根據記憶作答。</small>
                    </div>
              </div>
            )}

            <div className="challenge-options">
                  {presentedOptions.map((option, index) => (
                <button
                  key={option}
                  className={[
                    selectedAnswer === index ? "selected" : "",
                    questionFeedback === "correct" && selectedAnswer === index
                      ? "correct"
                      : "",
                    questionFeedback === "incorrect" &&
                        index === presentedAnswer
                      ? "answer"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (questionFeedback !== "idle") return;
                    playTone();
                    if (selectedAnswer !== null && selectedAnswer !== index) {
                      setOptionChanges((count) => count + 1);
                    }
                    setSelectedAnswer(index);
                  }}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              ))}
            </div>

            {questionFeedback === "idle" && (
              <button
                className="pixel-button gold confirm-choice"
                disabled={selectedAnswer === null}
                onClick={submitQuestion}
              >
                提交證據判斷
              </button>
            )}

            {questionFeedback === "retry" && (
              <div className="challenge-feedback retry">
                <div>
                  <strong>書記官敲了敲卷宗⋯⋯</strong>
                  <p>先查看一個提示，再作判斷。</p>
                </div>
                <button onClick={showNextCue}>
                  {cueLevel === 0 ? "取得一般提示" : "取得具體提示"} →
                </button>
              </div>
            )}

            {questionFeedback === "correct" && (
              <div className="challenge-feedback success">
                <strong>{cueLevel === 0 ? "證據成立！" : "提示後破解"}</strong>
                <span>答案已記錄</span>
              </div>
            )}

            {questionFeedback === "incorrect" && (
              <div className="challenge-feedback incorrect">
                <div>
                  <strong>這項證據暫不成立</strong>
                      <p>
                        正確答案：
                        {presentedAnswer === null
                          ? ""
                          : presentedOptions[presentedAnswer]}
                      </p>
                </div>
                <span>→</span>
              </div>
            )}
          </div>

          {reviewOpen && (
            <div className="review-overlay">
              <div className="review-window">
                <div className="review-heading">
                  <div>
                    <p className="pixel-kicker">CASE FILE REVIEW</p>
                    <h2>重看雙方陳詞</h2>
                  </div>
                  <button onClick={() => setReviewOpen(false)}>×</button>
                </div>
                <div className="review-columns">
                  {(["prosecution", "defence"] as Side[]).map((side) => (
                    <article key={side}>
                        <h3>{casePassages[side].label}</h3>
                        <small>{casePassages[side].speaker}</small>
                        {casePassages[side].paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </article>
                  ))}
                </div>
                <button
                  className="pixel-button gold"
                  onClick={() => setReviewOpen(false)}
                >
                  返回挑戰
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {screen === "verdict" && (
        <section className="verdict-stage">
          <div className="verdict-header">
            <div>
              <p className="pixel-kicker">FINAL DELIBERATION</p>
              <h2>法官閣下，請作出裁決。</h2>
            </div>
            <button
              onClick={() => {
                setReviewOpen(true);
                setQuestionReviews((count) => count + 1);
                setPassageReviews((count) => count + 1);
              }}
            >
              ◫ 最後重看陳詞
            </button>
          </div>

          <div className="verdict-scroll">
            <div className="verdict-section">
              <span className="step-number">01</span>
              <div>
                <h3>本案裁決</h3>
                <p>先判斷指控是否有足夠證據支持。</p>
                <div className="finding-grid">
                  {findings.map((item) => (
                    <button
                      key={item.id}
                      className={finding === item.id ? "selected" : ""}
                      onClick={() => {
                        playTone();
                        setFinding(item.id);
                      }}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.sub}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="verdict-section">
              <span className="step-number">02</span>
              <div>
                <h3>法律處理</h3>
                <p>選擇你認為與行為和情況相稱的處理。</p>
                <div className="punishment-grid">
                  {punishments.map((item) => (
                    <button
                      key={item.id}
                      className={punishment === item.id ? "selected" : ""}
                      onClick={() => {
                        playTone();
                        setPunishment(item.id);
                      }}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="verdict-section">
              <span className="step-number">03</span>
              <div>
                <h3>撰寫判詞</h3>
                <p>可使用鍵盤輸入，或按 iPad 鍵盤上的咪高峰進行語音輸入。</p>
                <textarea
                  value={judgment}
                  onChange={(event) => setJudgment(event.target.value)}
                  placeholder="我的裁決是……最重要的證據是……我選擇這個處理方法，因為……"
                  rows={5}
                />
                <div className="judgment-meter">
                  <i>
                    <b style={{ width: `${Math.min(100, judgment.length * 3)}%` }} />
                  </i>
                  <span>{judgment.length} 字</span>
                </div>
              </div>
            </div>
          </div>

          <button
            className="stamp-button"
            disabled={!finding || !punishment || !judgment.trim()}
            onClick={stampVerdict}
          >
            <span>⚒</span>
            敲槌宣判
          </button>

          {reviewOpen && (
            <div className="review-overlay">
              <div className="review-window">
                <div className="review-heading">
                  <div>
                    <p className="pixel-kicker">CASE FILE REVIEW</p>
                    <h2>重看雙方陳詞</h2>
                  </div>
                  <button onClick={() => setReviewOpen(false)}>×</button>
                </div>
                <div className="review-columns">
                  {(["prosecution", "defence"] as Side[]).map((side) => (
                    <article key={side}>
                        <h3>{casePassages[side].label}</h3>
                        <small>{casePassages[side].speaker}</small>
                        {casePassages[side].paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </article>
                  ))}
                </div>
                <button
                  className="pixel-button gold"
                  onClick={() => setReviewOpen(false)}
                >
                  返回裁決
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {screen === "result" && (
        <section className="result-stage">
          <div className="gavel-impact" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="verdict-stamp">
            <span>CASE {currentCase.caseNumber}</span>
            <strong>案件結案</strong>
            <small>JUDGMENT FILED</small>
          </div>
          <div className="result-content">
            <p className="pixel-kicker">COURT RECORD UPDATED</p>
            <h2>
              判決完成
              <br />
              <span>來看看你的判斷。</span>
            </h2>
            <div className="result-score">
              <div>
                <strong>{independentCorrect}/5</strong>
                <span>獨立破解</span>
              </div>
              <div>
                <strong>{records.filter((record) => record.cueLevel > 0).length}</strong>
                <span>書記官提示</span>
              </div>
              <div>
                <strong>{ttsCount}</strong>
                <span>字詞朗讀</span>
              </div>
              <div>
                <strong>{judgmentCloseness}</strong>
                <span>判決接近度</span>
              </div>
            </div>
            <div className="performance-breakdown">
              <div className="performance-heading">
                <div>
                  <span>本案表現分數</span>
                  <strong>{performance.composite}/100</strong>
                </div>
                <b>{Math.round(performance.accuracy * 100)}% 答對</b>
              </div>
              <div className="performance-metrics">
                <span>平均 {performance.averageTimeSec} 秒／題</span>
                <span>提示依賴 {Math.round((1 - performance.helpScore) * 100)}%</span>
                <span>重看 {passageReviews} 次</span>
                <span>改選 {records.reduce((total, record) => total + record.optionChanges, 0)} 次</span>
              </div>
            </div>
            <div className={`judgment-comparison ${judgmentDirection}`}>
              <div className="judgment-comparison-heading">
                <div>
                  <span>公平判決比較 · 原型參考</span>
                  <strong>{judgmentGrade}</strong>
                </div>
                <b>{judgmentCloseness}/100</b>
              </div>
              <div className="closeness-track">
                <i style={{ width: `${judgmentCloseness}%` }} />
              </div>
              <div className="judgment-pair">
                <span>
                  你的裁決：{selectedFindingLabel} · {selectedPunishmentLabel}
                </span>
                <span>
                  公平裁決：{idealFindingLabel} · {idealPunishmentLabel}
                </span>
              </div>
              <p>{idealJudgment.reasoning}</p>
            </div>
            <div className="result-actions">
              <button className="pixel-button gold" onClick={resetGame}>
                再選一宗案件
              </button>
              <button className="pixel-button dark" onClick={() => setInspectorOpen(true)}>
                查看本案表現
              </button>
            </div>
          </div>
        </section>
      )}

      <div
        className={`inspector-backdrop ${inspectorOpen ? "open" : ""}`}
        onClick={() => setInspectorOpen(false)}
      />
      <aside className={`profile-drawer ${inspectorOpen ? "open" : ""}`}>
        <div className="inspector-heading">
          <div>
            <p className="pixel-kicker">SESSION NOTES</p>
            <h2>本案表現摘要</h2>
          </div>
          <button
            onClick={() => setInspectorOpen(false)}
            aria-label="關閉我的法官檔案"
          >
            ×
          </button>
        </div>
        <div className="mastery-console">
          <h3>理解題表現</h3>
          {(Object.keys(mastery) as Construct[]).map((construct) => (
            <div key={construct}>
              <span>{constructMeta[construct].short}</span>
              <i>
                <b
                  style={{
                    width: `${mastery[construct] * 100}%`,
                    background: constructMeta[construct].color,
                  }}
                />
              </i>
              <strong>{Math.round(mastery[construct] * 100)}</strong>
            </div>
          ))}
          <p>本次五題的答題、提示和重看行為，供 SLP 會談時參考。</p>
        </div>
        <div className="behavior-console prior-performance">
          <h3>本案紀錄</h3>
          <dl>
            <div>
              <dt>案件級別</dt>
              <dd>P.{currentCase.grade}</dd>
            </div>
            <div>
              <dt>獨立答對</dt>
              <dd>{independentCorrect}/5</dd>
            </div>
            <div>
              <dt>需要提示</dt>
              <dd>{records.filter((record) => record.cueLevel > 0).length}</dd>
            </div>
            <div>
              <dt>重看陳詞</dt>
              <dd>{passageReviews} 次</dd>
            </div>
            <div>
              <dt>改選答案</dt>
              <dd>{records.reduce((total, record) => total + record.optionChanges, 0)} 次</dd>
            </div>
            <div>
              <dt>綜合表現</dt>
              <dd>{screen === "result" ? `${performance.composite}/100` : "進行中"}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </main>
  );
}
