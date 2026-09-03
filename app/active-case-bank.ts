import {
  caseLibrary as authoredCases,
  idealJudgments as authoredIdealJudgments,
  type CourtCase,
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

const allCases = [
  ...authoredCases,
  ...generatedCases,
  ...generatedCases031To040,
  ...expandedCases,
];

const gradeMetadata = {
  1: {
    complexity: "兩至三個具體事件、順序清楚",
    vocabulary: "生活常用詞、簡單時間詞",
    edbFocus: "找出人物、物件及主要信息",
  },
  2: {
    complexity: "三個具體事件、簡單因果",
    vocabulary: "常用詞、方位詞及原因詞",
    edbFocus: "連繫事件次序及作簡單推論",
  },
  3: {
    complexity: "三至四個事件、明確原因與結果",
    vocabulary: "常用詞及少量情境抽象詞",
    edbFocus: "理解事實、簡單推論及文中詞義",
  },
  4: {
    complexity: "四至五個事件、多步行動及兩項成因",
    vocabulary: "連接詞、情境詞及常見抽象詞",
    edbFocus: "整合兩篇信息並理解多步因果",
  },
  5: {
    complexity: "五至六個事件、多重原因、觀點差異及補救",
    vocabulary: "較多抽象詞及書面表達",
    edbFocus: "比較觀點並判斷資料是否充分",
  },
  6: {
    complexity: "六至八個事件、交錯線索、資料限制及反事實推理",
    vocabulary: "抽象詞、條件句及正式語體",
    edbFocus: "批判閱讀、跨篇整合及以資料論證",
  },
} as const;

function calibrateMetadata(courtCase: CourtCase): CourtCase {
  return {
    ...courtCase,
    complexity: gradeMetadata[courtCase.grade].complexity,
    vocabulary: gradeMetadata[courtCase.grade].vocabulary,
    edbFocus: gradeMetadata[courtCase.grade].edbFocus,
  };
}

export const activeCasesByGrade = ([1, 2, 3, 4, 5, 6] as const).reduce(
  (result, grade) => {
    result[grade] = allCases
      .filter((courtCase) => courtCase.grade === grade)
      .slice(0, 30)
      .map(calibrateMetadata);
    return result;
  },
  {} as Record<1 | 2 | 3 | 4 | 5 | 6, CourtCase[]>,
);

export const activeCases = ([1, 2, 3, 4, 5, 6] as const).flatMap(
  (grade) => activeCasesByGrade[grade],
);

export const activeIdealJudgments = {
  ...authoredIdealJudgments,
  ...generatedIdealJudgments,
  ...generatedIdealJudgments031To040,
  ...expandedIdealJudgments,
};
