// 온체인 조사 화면용 순수 함수
// 분석 결과(CaseAnalysis)를 거래소 담당자가 물을 질문 4개로 묶고, 요약 문장과 퍼짐 그림 배치를 만듭니다.
// 분석 자체(A~E, S)는 바꾸지 않습니다. 문장 규칙: docs/writing-rules.md (분모를 같이 쓰기, 판정하지 않기)

import { SCOPE } from "@/server/constants"; // 비밀값 없는 기준값이라 화면에서도 씁니다
import type { AnalysisCode, CaseAnalysis, EvidenceCategory, EvidenceItem, SourceRef, Transfer } from "@/types/case";

export type QuestionId = "prior" | "spray" | "after" | "sanctions";

// 조사 중 화면에도 같은 순서로 보입니다
export const ANALYSIS_CHECKS: { id: QuestionId; label: string }[] = [
  { id: "prior", label: "보낸 주소와 전에 주고받은 기록" },
  { id: "spray", label: "같은 때 비슷한 금액을 받은 지갑" },
  { id: "after", label: "입금 뒤 내 지갑에서 보낸 기록" },
  { id: "sanctions", label: "제재 목록 확인" },
];

export interface AnalysisQuestion {
  id: QuestionId;
  code: AnalysisCode;
  question: string;
  answer: string;
  detail: string;
  meaning: string; // 이 기록이 무슨 뜻인지 한 줄 (사실만, 판정하지 않음)
  caution: boolean; // 사용자가 놀랄 수 있는 결과 (예: 제재 목록 일치)
  category: EvidenceCategory;
  sources: SourceRef[];
}

const byCode = (analysis: CaseAnalysis, code: AnalysisCode) =>
  analysis.evidence.filter((item) => item.analysis === code);

const sourcesOf = (items: EvidenceItem[]) => items.flatMap((item) => item.sources);

// 정수 금액(rawValue) → 읽기 쉬운 숫자. 소수는 유효숫자 4자리까지만 씁니다.
export function formatUnits(raw: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  let fraction = decimals > 0 ? (raw % base).toString().padStart(decimals, "0") : "";
  if (whole > BigInt(0)) {
    fraction = fraction.slice(0, 4);
  } else {
    const leadingZeros = fraction.length - fraction.replace(/^0+/, "").length;
    fraction = fraction.slice(0, leadingZeros + 4);
  }
  fraction = fraction.replace(/0+$/, "");
  const wholeText = whole.toLocaleString("en-US");
  return fraction ? `${wholeText}.${fraction}` : wholeText;
}

// "비슷한 금액"을 ±10% 대신 실제 범위로 씁니다. 예: 0.0009~0.0011 ETH
export function similarRange(transfer: Transfer, ratio: number = SCOPE.similarAmountRatio) {
  const raw = BigInt(transfer.rawValue);
  const scale = BigInt(1000);
  const step = BigInt(Math.round(ratio * 1000));
  const low = (raw * (scale - step)) / scale;
  const high = (raw * (scale + step)) / scale;
  return `${formatUnits(low, transfer.decimals)}~${formatUnits(high, transfer.decimals)} ${transfer.asset}`;
}

function limitNote(analysis: CaseAnalysis) {
  return analysis.scope.complete ? "" : `최대 ${analysis.scope.maxTransfers.toLocaleString("en-US")}건까지 조회한 범위에서 `;
}

// 화면 맨 위 한 줄. 확인된 사실과 분석한 정황만 쓰고 판정하지 않습니다.
export function analysisSummary(analysis: CaseAnalysis) {
  const { facts, scope } = analysis;
  const spray =
    facts.similarAmountCount > 1
      ? `${limitNote(analysis)}보낸 주소는 ${scope.windowLabel} 동안 상대 지갑 ${facts.senderRecipientCount}곳 중 ${facts.similarAmountCount}곳에 비슷한 금액을 보냈습니다.`
      : `${limitNote(analysis)}보낸 주소가 ${scope.windowLabel} 동안 비슷한 금액을 보낸 다른 주소는 확인되지 않았습니다.`;
  const prior =
    facts.priorDirectTransactions === 0
      ? "조회한 기록에서 입금 전 직접 거래는 확인되지 않았습니다."
      : `조회한 기록에서 입금 전 직접 거래가 ${facts.priorDirectTransactions}건 있습니다.`;
  // 불리한 결과도 요약에서 빼지 않습니다
  const sanctions = analysis.sanctions.senderMatched
    ? "보낸 주소는 조회한 제재 목록과 일치합니다."
    : "보낸 주소는 조회한 제재 목록에서 일치하지 않습니다.";
  return `${spray} ${prior} ${sanctions}`;
}

export function analysisQuestions(analysis: CaseAnalysis): AnalysisQuestion[] {
  const { facts, scope, sanctions, transfer } = analysis;
  const prior = byCode(analysis, "B");
  const spray = byCode(analysis, "C");
  const after = byCode(analysis, "D");
  const sanction = byCode(analysis, "S");
  const returnItem = after.find((item) => item.id === "D-return");
  const firstOutgoing = after.find((item) => item.id !== "D-return");

  return [
    {
      id: "prior",
      code: "B",
      question: "보낸 주소와 이전에 거래한 적이 있나요?",
      answer: `${facts.priorDirectTransactions}건`,
      detail: `입금 전 기록 전체에서 두 주소가 직접 주고받은 전송 (최대 ${analysis.scope.maxTransfers.toLocaleString("en-US")}건)`,
      meaning:
        facts.priorDirectTransactions === 0
          ? "두 주소가 이 입금 전에 서로 주고받은 기록이 없어요 (조회한 범위 안)."
          : "두 주소가 이 입금 전에 직접 주고받은 기록이 있어요.",
      caution: false,
      category: prior[0]?.category ?? "verified",
      sources: sourcesOf(prior),
    },
    {
      id: "spray",
      code: "C",
      question: "보낸 주소가 비슷한 금액을 여러 곳에 보냈나요?",
      answer: `${facts.similarAmountCount}곳`,
      detail: `${limitNote(analysis)}${scope.windowLabel}, 상대 지갑 ${facts.senderRecipientCount}곳 중 ${facts.similarAmountCount}곳이 ${similarRange(transfer)}`,
      meaning:
        facts.similarAmountCount > 1
          ? "같은 시간대에 여러 지갑에 비슷한 금액을 보낸 기록이에요. 내 지갑도 그중 하나예요."
          : "같은 시간대에 비슷한 금액을 받은 다른 지갑은 확인되지 않았어요.",
      caution: false,
      category: spray[0]?.category ?? "derived",
      sources: sourcesOf(spray),
    },
    {
      id: "after",
      code: "D",
      question: "입금 후 보낸 주소로 다시 보낸 전송이 있나요?",
      answer: facts.returnedToSender ? "있음" : "없음",
      detail: facts.returnedToSender
        ? (returnItem?.title ?? "입금 후 보낸 주소로 다시 보낸 기록이 있습니다")
        : `입금 후 ${SCOPE.afterDepositDays}일 동안 조회`,
      meaning: facts.returnedToSender
        ? "받은 뒤 보낸 주소로 다시 보낸 기록이 있어요."
        : firstOutgoing
          ? `다른 전송: ${firstOutgoing.title.replace(/습니다$/, "어요")}. 시간 순서만 나타내며, 무엇이었는지 4단계에서 적을 수 있어요.`
          : "보낸 주소로 다시 보낸 기록은 없어요.",
      caution: false,
      category: after[0]?.category ?? "verified",
      sources: sourcesOf(after),
    },
    {
      id: "sanctions",
      code: "S",
      question: "보낸 주소가 제재 목록에 있나요?",
      answer: sanctions.senderMatched ? "있음" : "없음",
      detail: `${sanctions.listName} (${sanctions.listUpdatedAt} 기준)`,
      meaning: sanctions.senderMatched
        ? "목록에 있는 것은 보낸 주소예요 (내 지갑은 비교하지 않음). 이더리움은 받는 쪽 동의 없이도 보낼 수 있어요."
        : "조회한 제재 목록에 보낸 주소가 없어요. 목록에 없다는 것만으로 어떤 주소인지 말할 수는 없어요.",
      caution: sanctions.senderMatched,
      category: sanction[0]?.category ?? "verified",
      sources: sourcesOf(sanction),
    },
  ];
}

// ── 쉬운 말 결과 ───────────────────────────────────────────
// 3단계 화면은 블록체인을 모르는 사람이 읽습니다. 질문 → 짧은 답 → 무슨 뜻인지 1~2문장 순서로,
// 사실만 쉬운 말로 옮깁니다 (판정하지 않기: docs/writing-rules.md). 소명서 문장은 서버(report)가 따로 만듭니다.

export interface PlainFinding {
  id: QuestionId;
  label: string; // 칸 제목 (짧게)
  question: string;
  answer: string; // 큰 글씨 답 (예: "없음", "34곳")
  short: string; // 답 아래 한 줄 (자세한 설명은 explain)
  caution: boolean; // 놀랄 수 있는 결과라 눈에 띄게
  explain: string;
  extra: string | null; // 덧붙일 사실 (입금 뒤 다른 곳으로 보낸 전송)
  category: EvidenceCategory;
  sources: SourceRef[];
}

// 증거 제목("…보냈습니다")을 화면 말투("…보냈어요")로, "본인 지갑"은 "내 지갑"으로
const toScreenTone = (title: string) => title.replace(/본인 지갑/g, "내 지갑").replace(/습니다$/, "어요");

export function plainFindings(analysis: CaseAnalysis): PlainFinding[] {
  const { facts, scope, sanctions, transfer } = analysis;
  const questions = new Map(analysisQuestions(analysis).map((question) => [question.id, question]));
  const pick = (id: QuestionId) => questions.get(id)!;
  const firstOutgoing = analysis.evidence.find((item) => item.analysis === "D" && item.id !== "D-return");
  const range = scope.complete ? "" : `최대 ${scope.maxTransfers.toLocaleString("en-US")}건까지 찾아본 범위에서 `;
  const prior = facts.priorDirectTransactions;
  const similar = facts.similarAmountCount;

  const limited = scope.complete ? "" : ` · 최대 ${scope.maxTransfers.toLocaleString("en-US")}건 범위`;

  return [
    {
      id: "prior",
      label: "이전에 주고받은 기록",
      question: "이번 입금 전에 보낸 주소와 코인을 주고받은 적이 있나요?",
      answer: prior === 0 ? "없음" : `${prior}건`,
      short: `이번 입금 전, 보낸 주소와 내 지갑 사이${limited}`,
      caution: false,
      explain:
        prior === 0
          ? `${range || "내 지갑의 지난 기록을 모두 찾아봤지만, "}두 지갑이 서로 코인을 보낸 기록은 없었어요.`
          : `${range}이번 입금 전에 두 지갑이 직접 주고받은 기록이 ${prior}건 있어요.`,
      extra: null,
      category: pick("prior").category,
      sources: pick("prior").sources,
    },
    {
      id: "spray",
      label: "같은 때 비슷한 금액을 받은 지갑",
      question: "같은 때 다른 지갑들도 비슷한 금액을 받았나요?",
      answer: similar > 1 ? `${similar}곳` : "없음",
      short:
        similar > 1
          ? `보낸 곳 ${facts.senderRecipientCount}곳 중 · 내 지갑 포함${limited}`
          : `${scope.windowLabel}, 내 지갑 말고는 없음${limited}`,
      caution: false,
      explain:
        similar > 1
          ? `${range}보낸 주소는 ${scope.windowLabel} 동안 지갑 ${facts.senderRecipientCount}곳에 코인을 보냈어요. 그중 ${similar}곳이 내 지갑처럼 비슷한 금액(${similarRange(transfer)})을 받았어요. 내 지갑도 이 ${similar}곳에 들어 있어요.`
          : `${range}보낸 주소가 ${scope.windowLabel} 동안 비슷한 금액을 보낸 다른 지갑은 기록에 없어요.`,
      extra: null,
      category: pick("spray").category,
      sources: pick("spray").sources,
    },
    {
      id: "after",
      label: "보낸 주소로 돌려보낸 기록",
      question: "받은 뒤, 보낸 주소로 코인을 돌려보낸 적이 있나요?",
      answer: facts.returnedToSender ? "있음" : "없음",
      short: `입금 후 ${SCOPE.afterDepositDays}일 동안`,
      caution: false,
      explain: facts.returnedToSender
        ? "입금 뒤 내 지갑에서 보낸 주소로 다시 보낸 기록이 있어요."
        : `입금 뒤 ${SCOPE.afterDepositDays}일 동안 내 지갑에서 보낸 주소로 보낸 기록은 없어요.`,
      extra: firstOutgoing
        ? `참고로, ${toScreenTone(firstOutgoing.title)}. 지갑에 원래 있던 코인과 섞여 있어서 이번 입금이 들어 있었는지는 기록으로 알 수 없어요. 무엇이었는지 다음 단계에서 적을 수 있어요.`
        : null,
      category: pick("after").category,
      sources: pick("after").sources,
    },
    {
      id: "sanctions",
      label: "보낸 주소의 제재 목록 확인",
      question: "보낸 주소가 제재 목록에 올라 있나요?",
      answer: sanctions.senderMatched ? "목록에 있음" : "목록에 없음",
      short: sanctions.senderMatched ? "목록에 있는 건 보낸 쪽 주소예요" : `${sanctions.listUpdatedAt} 기준 목록`,
      caution: sanctions.senderMatched,
      explain: sanctions.senderMatched
        ? `제재 목록은 각국 정부가 거래를 금지한 사람 · 주소 목록이에요. 보낸 주소가 ${sanctions.listName}(${sanctions.listUpdatedAt} 기준)에 올라 있어요. 목록에 있는 건 보낸 쪽 주소이고, 내 지갑은 이 목록과 비교하지 않았어요. 코인은 받는 사람이 동의하지 않아도 보낼 수 있어요.`
        : `제재 목록은 각국 정부가 거래를 금지한 사람 · 주소 목록이에요. ${sanctions.listName}(${sanctions.listUpdatedAt} 기준)에 보낸 주소는 없어요. 다만 목록에 없다는 것만으로 어떤 주소인지 말할 수는 없어요.`,
      extra: null,
      category: pick("sanctions").category,
      sources: pick("sanctions").sources,
    },
  ];
}

export function analysisUnknowns(analysis: CaseAnalysis) {
  return analysis.evidence.filter((item) => item.category === "unverifiable");
}

// ── 퍼짐 그림 배치 ─────────────────────────────────────────
// 보낸 주소 하나에서 받은 주소들로 퍼지는 그림. 내 지갑은 받은 주소 중 하나로 그립니다.
// (받은 주소 수와 비슷한 금액 수에는 내 지갑도 들어 있습니다: analysis/c-spray-pattern.ts)

export interface SpreadDot {
  x: number;
  y: number;
  kind: "mine" | "similar" | "other";
}

export const SPREAD_VIEW = { width: 420, height: 220 } as const;
export const SPREAD_SENDER = { x: 56, y: 110 } as const;
const MAX_ROWS = 8;
const MAX_DOTS = 48;

export function spreadLayout(recipientCount: number, similarCount: number, maxDots = MAX_DOTS) {
  const total = Math.max(1, recipientCount);
  const similar = Math.min(Math.max(1, similarCount), total); // 내 지갑은 늘 비슷한 금액 쪽
  const shown = Math.min(total, maxDots);
  const rows = Math.min(MAX_ROWS, shown);
  const cols = Math.ceil(shown / rows);
  const colStep = cols > 1 ? Math.min(40, 155 / (cols - 1)) : 0;
  const rowStep = rows > 1 ? Math.min(26, 196 / (rows - 1)) : 0;
  const top = SPREAD_SENDER.y - (rowStep * (rows - 1)) / 2;
  const mineIndex = Math.floor((rows - 1) / 2); // 첫 줄 가운데: 보낸 주소와 가장 가까운 자리

  // 내 지갑을 뺀 나머지 중 "다른 금액" 점 수 (점이 다 안 들어가면 비율대로)
  const others = shown - 1;
  const otherTotal = total - 1;
  const differentShown = otherTotal > 0 ? Math.round(((total - similar) * others) / otherTotal) : 0;

  const dots: SpreadDot[] = [];
  let otherIndex = 0;
  for (let index = 0; index < shown; index++) {
    const col = Math.floor(index / rows);
    const row = index % rows;
    const x = 250 + col * colStep;
    const y = top + row * rowStep;
    if (index === mineIndex) {
      dots.push({ x, y, kind: "mine" });
      continue;
    }
    // 다른 금액 점을 고르게 흩어 놓습니다
    const isDifferent =
      others > 0 &&
      Math.floor(((otherIndex + 1) * differentShown) / others) > Math.floor((otherIndex * differentShown) / others);
    dots.push({ x, y, kind: isDifferent ? "other" : "similar" });
    otherIndex++;
  }

  return { dots, hidden: total - shown };
}
