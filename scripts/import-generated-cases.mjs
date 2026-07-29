import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [
  inputPath,
  outputPath = "app/generated-cases.ts",
  caseNumberOffsetValue = "0",
] = process.argv.slice(2);
const caseNumberOffset = Number(caseNumberOffsetValue);

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/import-generated-cases.mjs <input.csv> [output.ts] [case-number-offset]",
  );
}
if (!Number.isInteger(caseNumberOffset) || caseNumberOffset < 0) {
  throw new Error("The case-number offset must be a non-negative integer.");
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
  "共用打印機損壞責任": {
    ideal_finding: "insufficient",
    ideal_punishment: "none",
    ideal_severity: "0",
    ideal_reasoning:
      "閉路電視只證明兩人在場，未能顯示誰按下按鈕；投訴方只提出懷疑，回應方則有兩次書面反映卡紙及過熱。現有資料支持機件老化的可能，但仍不能確定直接原因，因此證據不足，無需處分，應由公司先作技術檢驗。",
  },
  "的士改道收費爭議": {
    ideal_reasoning:
      "司機的說法有正式封路通告、交通廣播及公司維修紀錄可供核查，車費亦按咪錶計算；乘客只以路程和車費增加推斷故意繞路。司機應更清楚說明可能增加的費用，但現有資料不足以支持惡意指控，罪名不成立且無需處分。",
  },
  "餐廳上錯菜爭議": {
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
  "樓上滲水責任爭議": {
    ideal_punishment: "none",
    ideal_severity: "0",
    ideal_reasoning:
      "管理處初步指向樓上水管，但技術人員未全面檢查樓上浴室和公共管道；回應方也表示單位內沒有明顯水跡。現有資料未能排除公共管道或外牆問題，因此證據不足，現階段不應處分任何一方，應先安排獨立檢測。",
  },
  "嘉年華攤位噪音爭議": {
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "音響雖獲批准，但投訴方曾多次要求降低，回應方承認為維持遊戲效果再次調高；另一方面，銷售下降也可能受天氣、定價和人流影響，不能全歸因於噪音。雙方都應改善協調，以正式警告提醒遵守音量和相鄰攤位安排。",
  },
  "公園種樹程序爭議": {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "署方表示申請已提交，但既定程序仍要求廣泛收集居民意見及公示結果；居民會只有入口告示和一次簡短說明會，未能證明已完成較廣泛諮詢。綠化目的正當且樹木已有原則批准，因此以責任成立和正式警告處理，比移除樹木或嚴厲處分相稱。",
  },
  "走廊垃圾放置爭議": {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "黃先生承認把垃圾袋放在門外，而大廈規則要求垃圾放入指定位置；垃圾桶是否接近滿載，不改變走廊受異味和阻塞影響的事實。由於他翌日已清理並表示會改善，宜判主要責任成立並作正式警告，不需更重處分。",
  },
  "二手書桌成色爭議": {
    ideal_reasoning:
      "賣家的文字稱「無明顯損毀」，與買家收到的多處刮痕及角位缺損有差距；但照片已顯示部分使用痕跡，買家也沒有進一步查詢。雙方在披露和核對上均有不足，宜由賣家補償合理差價，而不是要求全額退款。",
  },
  "清晨鑽牆聲": {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "李先生承認星期六七時五十分啟動過電鑽，早於守則所定的八時，投訴方因此受到噪音影響。陳先生對長期鑽牆的指控未有其他資料佐證，但這不構成他的過失。宜判回應方須負主要責任，以正式警告提醒日後嚴格遵守工程時間。",
  },
  "雨傘失蹤記": {
    ideal_finding: "guilty",
    ideal_punishment: "compensation",
    ideal_severity: "2",
    ideal_reasoning:
      "梁店員確認黃女士曾放下一把有明顯記認的雨傘，也親眼看見另一名客人取走同類雨傘，卻沒有作簡單查問。免責告示可提醒客人自行保管，但不能完全抵銷店員已察覺可疑情況而沒有處理的責任。宜作有限度補償，而非必然按原價全數賠償。",
    q3_prompt: "文中「不理睬」最接近甚麼意思？",
    q3_option_0: "沒有加以理會",
    q3_option_1: "細心照顧",
    q3_option_2: "立即賠償",
    q3_option_3: "反覆查問",
    q3_answer_index: "0",
    q3_general_cue: "想想黃女士如何理解店員的回應態度。",
    q3_specific_cue: "重看回應方第三段最後四個字。",
    q3_evidence_quote: "並非不理睬",
  },
  "訂造蛋糕之爭": {
    ideal_reasoning:
      "店家承認糖霜字樣寫錯，而且成品與書面訂單的主要要求不符。雙方對尺寸是否曾更改各有說法，但店家的更改紀錄沒有顧客確認，不能推卸製作前核對訂單的責任。宜退回已付訂金並就未能按約交付作合理補償，但補償不應包括沒有證明的間接損失。",
  },
  "巴士遺失書包": {
    ideal_finding: "insufficient",
    ideal_punishment: "none",
    ideal_severity: "0",
    ideal_reasoning:
      "八達通紀錄和校門片段只證明男童曾乘車及上車時帶着書包，未能顯示書包其後由誰取走。司機的兩次巡查和交更表支持其說法，但公司沒有保存車廂影像，客服紀錄亦前後不一。現有資料不足以判定司機曾棄置書包，因此不作處分，營辦商則應改善失物紀錄程序。",
    q3_prompt: "文中客服「改口」最接近甚麼意思？",
    q3_option_0: "改變原來的說法",
    q3_option_1: "轉用另一種口音",
    q3_option_2: "降低說話聲量",
    q3_option_3: "請另一人回答",
    q3_answer_index: "0",
    q3_general_cue: "比較客服第一次和第二次提供的資料。",
    q3_specific_cue: "重看投訴方第二段「卻改口說」前後的內容。",
    q3_evidence_quote: "客服卻改口說司機交更前檢查過",
    q5_prompt: "哪一項最能說明現有資料仍不足以確定書包由誰取走？",
    q5_option_0: "書包內有功課簿和眼鏡",
    q5_option_1: "男童乘坐的是K16號小巴",
    q5_option_2: "營辦商沒有保存當日車廂影像，也沒有乘客目擊書包去向",
    q5_option_3: "羅太在晚上八時致電查詢",
    q5_answer_index: "2",
    q5_general_cue: "找出能直接核實書包去向的資料缺口。",
    q5_specific_cue: "重看投訴方第三段對營辦商查核結果的描述。",
    q5_evidence_quote: "車廂攝錄系統只供即時監察，沒有保存當日片段，也沒有其他乘客報稱見過書包",
  },
  "操場皮球誤傷": {
    ideal_finding: "guilty",
    ideal_punishment: "compensation",
    ideal_severity: "2",
    ideal_reasoning:
      "陳先生承認事發時低頭回覆短訊，未有持續留意十歲兒子的傳球方向；皮球偏離練習範圍並令蘇太受傷，因此監護和場地安全責任主要在回應方。蘇太穿過草地可作為風險背景，但原文沒有顯示她違反規則，不應判她共同有錯。六十元交通費屬相稱補償。",
  },
  "團購電飯煲": {
    ideal_reasoning:
      "根據案件提供的交易資料，方先生在收貨當日已拍照及通知商戶，外箱完整而產品有花痕和凹陷；商戶也確認自己是訂單賣方。即使損壞可能發生於第三方運送，商戶仍應先按平台程序協助換貨、退款或處理索償，而不應只叫顧客自行追討。宜作合理補償。",
    q3_prompt: "文中「索償」最接近甚麼意思？",
    q3_option_0: "要求賠償損失",
    q3_option_1: "查詢送貨時間",
    q3_option_2: "取消團購訂單",
    q3_option_3: "替貨品拍照",
    q3_answer_index: "0",
    q3_general_cue: "想想貨品受損後，顧客會向公司提出甚麼要求。",
    q3_specific_cue: "重看投訴方第二段客服叫方先生做的事情。",
    q3_evidence_quote: "自行聯絡速遞公司索償",
  },
  "街市轉租攤位": {
    ideal_reasoning:
      "孔小姐最初准許吳先生暫放貨物，但雙方沒有把期限和範圍寫清楚，造成理解分歧。吳先生其後把貨物擴展至近三分一攤位，在收到清場要求後仍加放新紙箱，須負較大責任；孔小姐長時間接受謝禮而沒有及早澄清，也令誤會持續。宜正式警告並限期搬走物品。",
    q3_prompt: "文中「明言」最接近甚麼意思？",
    q3_option_0: "清楚地說明",
    q3_option_1: "悄悄地接受",
    q3_option_2: "立即搬走",
    q3_option_3: "寫成正式合約",
    q3_answer_index: "0",
    q3_general_cue: "想想吳先生認為孔小姐有沒有清楚說出限期。",
    q3_specific_cue: "重看回應方第一段「並沒有明言」的一句。",
    q3_evidence_quote: "並沒有明言限期為三數天",
  },
  "健身房私教爭議": {
    ideal_reasoning:
      "畢先生承認曾兩次嚴重遲到，教練亦有訊息提醒，學員須為遲到負部分責任；但停課和沒收餘下費用的規則只曾口頭說明，收據及條款均沒有記錄，會所也沒有提供申訴程序。宜判雙方均有責任，由會所安排其餘課堂或退還相應部分費用，而非全數沒收。",
    prosecution_p1:
      "我姓畢，去年十一月向「動力健身」購買二十堂私人教練課程，共支付九千六百元，每堂四百八十元，指定教練為林教練，每星期二及五晚上八時上課。",
    q1_prompt: "畢先生每堂私人教練課程的收費是多少？",
    q1_option_0: "三百八十元",
    q1_option_1: "四百八十元",
    q1_option_2: "五百八十元",
    q1_option_3: "九百六十元",
    q1_answer_index: "1",
    q1_general_cue: "用課程總費用和堂數核對每堂收費。",
    q1_specific_cue: "重看投訴方第一段「共支付」之後的金額。",
    q1_evidence_quote: "每堂四百八十元",
  },
  "義工分派物資": {
    ideal_finding: "guilty",
    ideal_punishment: "warning",
    ideal_severity: "1",
    ideal_reasoning:
      "田先生承認未獲批准便把名單內物資改派他人，也忘記通知組長，程序責任成立。不過他曾兩次致電請示，動機是協助看來不適的長者，並願意自費補回物資，這些都是重要的減輕因素。宜作正式警告和補回物資，不應使用更嚴厲的處分。",
  },
  "展覽場地音效爭議": {
    ideal_reasoning:
      "段主辦遲交最終場地圖，令音響公司需要臨時改動配線；音響公司則明知合約限時，仍未能在中午前完成，開幕時也出現聲音中斷。雙方的行為都影響結果，但現有資料不足以把全部損失歸於單一一方。宜按實際服務受影響程度退回部分費用。",
    q4_prompt: "綜合雙方陳述，哪一項是雙方都承認的事實？",
    q4_option_0: "部分安裝工序在中午十二時後才完成",
    q4_option_1: "開幕由早上七時開始",
    q4_option_2: "段主辦親自安裝揚聲器",
    q4_option_3: "音響公司從未到場",
    q4_answer_index: "0",
    q4_general_cue: "比較雙方所說的安裝完成時間。",
    q4_specific_cue: "對照投訴方第二段和回應方第二段的時間。",
    q4_evidence_quote: "音響公司只完成大約一半安裝／一部分工序延至下午一時左右才完成",
  },
};

const contentAdditions = {
  "雨傘失蹤記": {
    prosecution_p3:
      "店內沒有提供傘袋、取傘牌或其他核對安排，傘架又設在入口旁，任何人都可以自行取傘。我事後要求翻查閉路電視，店方表示鏡頭只拍到收銀處，未能看清傘架。",
    defence_p3:
      "事後我把情況報告經理，並留下黃女士的聯絡方法。經理查看收銀處片段，只能確認灰衣男客曾經結帳，不能看見他從傘架取走的是哪一把傘。",
  },
  "訂造蛋糕之爭": {
    prosecution_p1:
      "店員把尺寸、字樣、取貨時間和五百元訂金寫在收據上，我亦拍下樣本圖片。收據沒有列出任何可以由店方單方面更改尺寸或裝飾的條款。",
    prosecution_p2:
      "通話期間我們只討論草莓缺貨和扣減價錢，我沒有提出縮小蛋糕。掛線後店家也沒有用短訊傳來修改後的訂單，讓我再次核對。",
    prosecution_p3:
      "我即場拍下成品和收據，並在親友到場前另購一個普通蛋糕應急。雖然壽宴最終仍能舉行，但預訂蛋糕本來是當晚的重要安排。",
    defence_p2:
      "電話由一名兼職店員接聽，他在紙本訂單旁寫上更改尺寸和折扣，但沒有記下通話時間，也沒有請何小姐回覆短訊確認。該店員現時已離職，只有這張手寫記錄可供查閱。",
    defence_p3:
      "我們承認出貨前沒有由第二名員工覆核字樣。冷藏草莓的數量亦比樣本少，但蛋糕的材料和人工已經使用，因此希望以部分退款處理。",
  },
  "巴士遺失書包": {
    prosecution_p1:
      "兒子的八達通紀錄顯示他在下午三時五十二分登上該班小巴；學校門口片段也拍到他上車前背着黑色書包，但鏡頭沒有拍到他下車時的情況。",
    prosecution_p2:
      "我向營辦商要求翻查車廂影像，職員其後回覆，車廂攝錄系統只供即時監察，沒有保存當日片段，也沒有其他乘客報稱見過書包。",
    prosecution_p3:
      "客服紀錄只有通話摘要，沒有寫明是誰提出「可能當垃圾處理」的推測。營辦商亦未能提供當晚清潔人員的姓名、巡查時間或失物登記表。",
    defence_p1:
      "我在總站巡視時按公司程序由車頭走到車尾，查看座位下方和行李位置，並在手機工作表記下完成時間。工作表顯示下午四時二十六分完成首次檢查。",
    defence_p2:
      "清潔位置由另一間承辦商管理，司機不能接觸其垃圾處理紀錄。我翌日得知投訴後，也曾到總站失物櫃和附近垃圾收集點詢問，但沒有找到書包。",
    defence_p3:
      "我同意客服的回覆令人混亂，公司應該保存更完整的失物查詢紀錄。不過這只能反映程序不足，不能證明我曾看見或丟棄書包。",
  },
  "團購電飯煲": {
    prosecution_p1:
      "訂單頁列明產品享有一年保養，並提醒顧客如發現外觀或功能問題，須在收貨後四十八小時內經平台聯絡商戶。",
    prosecution_p2:
      "我在收貨後約一小時便上載開箱照片，照片同時拍到完整外箱、機身花痕和凹陷。平台紀錄顯示客服在當日下午已讀取訊息。",
    defence_p2:
      "平台條款把運輸損壞列為物流索償項目，但沒有清楚寫明應由顧客還是商戶提出申請。我們因此沿用以往做法，先請顧客聯絡速遞公司。",
  },
  "街市轉租攤位": {
    prosecution_p1:
      "A17與A18之間以地面黃線劃分範圍，租約亦寫明檔主不得把攤位轉租或讓其他人長期佔用。最初兩個紙箱只放在黃線內側一小角。",
    prosecution_p2:
      "四月起，我先後三次用口頭提醒吳先生減少紙箱，並在五月十二日傳短訊要求他月底前搬走。短訊顯示已讀，但他沒有回覆。",
    prosecution_p3:
      "我拍下不同日期的照片，可見紙箱由兩個增加至七個，其中兩個越過黃線，阻礙我打開儲物櫃。收下蝦米只是鄰里禮貌，並不代表同意長期佔用。",
    defence_p1:
      "當時孔小姐沒有指出黃線或租約限制，也沒有要求我簽借用記錄。我一直把較重紙箱靠牆擺放，以免阻塞主要通道。",
    defence_p2:
      "我承認收到五月十二日的短訊，但當時理解「月底前處理」是先減少數量，而不是全部搬走。我其後移走兩箱，孔小姐沒有再回覆。",
    defence_p3:
      "上星期五收到即日清場要求後，我聯絡倉庫安排位置，對方最快一星期後才有空位。我願意在期限內搬走，也願意與孔小姐書面訂明過渡安排。",
  },
  "健身房私教爭議": {
    prosecution_p1:
      "付款收據只列出課程名稱、堂數和總額，沒有附上遲到、取消或停課條款。銷售職員當時只說預約須提前一天更改。",
    prosecution_p2:
      "我承認兩次遲到二十分鐘，兩堂亦已按正常時段結束，沒有要求延長。教練所說另外兩次遲到，其實分別只有八分鐘和九分鐘，而且我有在到達前發訊息通知。",
    prosecution_p3:
      "我要求會所提供完整出席紀錄和申訴渠道，但經理只轉發教練的訊息截圖，沒有安排會面。八堂餘額在會員系統中則顯示為「暫停使用」。",
    defence_p1:
      "我在第一堂以口頭逐項講解規則，也在手機備忘錄記下講解日期，但沒有要求畢先生簽名。會所當時沒有統一的書面版本供教練派發。",
    defence_p2:
      "我的預約系統顯示四次課堂都在八時後簽到，其中兩次超過二十分鐘，另外兩次不足十分鐘。我曾兩度傳訊息提醒準時，但沒有逐次列明再犯後果。",
    defence_p3:
      "停課後我把理由交給會所經理，但沒有先讓畢先生申述。後來我提出由另一教練完成四堂，是把其餘四堂視作遲到扣除；這個計算方法也未曾寫在收據上。",
  },
  "展覽場地音效爭議": {
    prosecution_p1:
      "合約另寫明，如主辦方更改場地安排，雙方須盡快協商新的施工時間；但沒有列出遲交場地圖便自動延後完成時間。",
    defence_p1:
      "我們收到最終場地圖後曾於晚上十時二十分回覆，表示會盡力維持原定時間，但需要現場再確認電源位置。",
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
  Object.assign(row, contentRevisions[row.title] ?? {});
  const additions = contentAdditions[row.title] ?? {};
  for (const [key, addition] of Object.entries(additions)) {
    row[key] = `${row[key]}${addition}`;
  }
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
  const normalizedCaseNumber = Number(row.case_number) + caseNumberOffset;
  const normalizedId = `c${normalizedCaseNumber}`;
  if (seenIds.has(normalizedId)) throw new Error(`Duplicate ID: ${normalizedId}`);
  seenIds.add(normalizedId);
  row.normalized_id = normalizedId;
  row.normalized_case_number = String(normalizedCaseNumber).padStart(3, "0");

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
  caseNumber: row.normalized_case_number,
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
