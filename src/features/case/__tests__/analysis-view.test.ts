// 온체인 조사 화면(질문 4개, 요약 문장, 퍼짐 그림 배치) 테스트
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analysisQuestions,
  analysisSummary,
  analysisUnknowns,
  formatUnits,
  similarRange,
  spreadLayout,
  SPREAD_VIEW,
} from "@/features/case/analysis-view";
import type { CaseAnalysis, CaseFacts, Transfer } from "@/types/case";

const transfer: Transfer = {
  id: "0xabc:0",
  chainId: 1,
  txHash: "0xabc",
  eventIndex: 0,
  blockNumber: 1,
  timestamp: "2026-10-28T14:22:13Z",
  from: "0x9999999999999999999999999999999999999999",
  to: "0x1111111111111111111111111111111111111111",
  assetType: "native",
  asset: "ETH",
  contractAddress: null,
  rawValue: "1000000000000000",
  decimals: 18,
  displayValue: "0.001",
  sourceProvider: "demo",
  fetchedAt: "2026-11-03T01:30:00Z",
  explorerUrl: "https://etherscan.io/tx/0xabc",
};

const source = { label: "원본", url: "https://etherscan.io/tx/0xabc" };

function makeAnalysis(facts: Partial<CaseFacts> = {}, complete = true): CaseAnalysis {
  return {
    caseId: "CASE-TEST",
    version: "0.1.0",
    walletAddress: transfer.to,
    transfer,
    scope: {
      windowLabel: "입금 전후 24시간",
      windowStart: "",
      windowEnd: "",
      maxTransfers: 1000,
      fetchedTransfers: 40,
      complete,
      provider: "demo",
      fetchedAt: "",
      failures: [],
    },
    facts: {
      priorDirectTransactions: 0,
      senderRecipientCount: 40,
      similarAmountCount: 34,
      returnedToSender: false,
      firstOutgoingAfter: null,
      ...facts,
    },
    sanctions: { listName: "데모용 가짜 제재 목록", listUpdatedAt: "2026-11-01", checkedAt: "", senderMatched: true },
    evidence: [
      { id: "A-transaction", category: "verified", analysis: "A", title: "a", description: "", sources: [source] },
      { id: "S-sanctions", category: "verified", analysis: "S", title: "s", description: "", sources: [source] },
      { id: "B-prior", category: "verified", analysis: "B", title: "b", description: "", sources: [source] },
      { id: "C-spray", category: "derived", analysis: "C", title: "c", description: "", sources: [source] },
      { id: "D-return", category: "verified", analysis: "D", title: "d", description: "입금 후 7일 동안의 전송을 확인했습니다.", sources: [source] },
      {
        id: "D-first-outgoing",
        category: "verified",
        analysis: "D",
        title: "입금 10분 뒤 다른 주소로 0.3 ETH를 보냈습니다",
        description: "",
        sources: [source],
      },
      { id: "E-intent", category: "unverifiable", analysis: "E", title: "사용자의 실제 의도", description: "", sources: [] },
    ],
    nodes: [],
    edges: [],
  };
}

const BANNED = ["결백", "무관", "깨끗한", "안전한", "증명됨", "먼지 공격입니다"];

describe("금액 표시", () => {
  it("소수는 유효숫자 4자리까지, 정수는 천 단위 쉼표", () => {
    assert.equal(formatUnits(BigInt("900000000000000"), 18), "0.0009");
    assert.equal(formatUnits(BigInt("1100000000000000"), 18), "0.0011");
    assert.equal(formatUnits(BigInt("1125000000"), 6), "1,125");
    assert.equal(formatUnits(BigInt("1234567"), 6), "1.2345");
    assert.equal(formatUnits(BigInt(0), 18), "0");
  });

  it("비슷한 금액은 ±10% 대신 실제 범위로 씀", () => {
    assert.equal(similarRange(transfer), "0.0009~0.0011 ETH");
  });
});

describe("요약 문장", () => {
  it("분모를 같이 쓰고 판정하지 않음", () => {
    const text = analysisSummary(makeAnalysis());
    assert.match(text, /상대 지갑 40곳 중 34곳에 비슷한 금액을 보냈습니다/);
    assert.match(text, /입금 전 직접 거래는 확인되지 않았습니다/);
    for (const word of BANNED) assert.ok(!text.includes(word), word);
  });

  it("조회가 상한에 걸리면 범위를 밝힘", () => {
    assert.match(analysisSummary(makeAnalysis({}, false)), /^최대 1,000건까지 조회한 범위에서/);
  });

  it("비슷한 금액을 받은 곳이 내 지갑뿐이면 다른 주소는 확인되지 않았다고 씀", () => {
    const text = analysisSummary(makeAnalysis({ senderRecipientCount: 3, similarAmountCount: 1, priorDirectTransactions: 2 }));
    assert.match(text, /비슷한 금액을 보낸 다른 주소는 확인되지 않았습니다/);
    assert.match(text, /입금 전 직접 거래가 2건 있습니다/);
  });
});

describe("질문 4개", () => {
  it("B, C, D, S 순서로 답을 만듦", () => {
    const questions = analysisQuestions(makeAnalysis());
    assert.deepEqual(questions.map((q) => q.code), ["B", "C", "D", "S"]);
    assert.deepEqual(questions.map((q) => q.answer), ["0건", "34곳", "없음", "있음"]);
    assert.equal(questions[1].category, "derived");
    assert.match(questions[1].detail, /상대 지갑 40곳 중 34곳이 0.0009~0.0011 ETH/);
    assert.equal(questions[2].detail, "입금 후 7일 동안 조회");
    assert.match(questions[2].meaning, /다른 전송: 입금 10분 뒤 다른 주소로 0.3 ETH를 보냈어요/);
    for (const q of questions) assert.ok(q.sources.length > 0, `${q.id}에 원본 링크가 있어야 함`);
  });

  it("입금 후 나간 전송이 없으면 조회 기간을 씀", () => {
    const analysis = makeAnalysis();
    analysis.evidence = analysis.evidence.filter((item) => item.id !== "D-first-outgoing");
    const after = analysisQuestions(analysis)[2];
    assert.equal(after.detail, "입금 후 7일 동안 조회");
    assert.equal(after.meaning, "보낸 주소로 다시 보낸 기록은 없어요.");
  });

  it("확인할 수 없는 것만 따로 모음", () => {
    assert.deepEqual(analysisUnknowns(makeAnalysis()).map((item) => item.id), ["E-intent"]);
  });
});

describe("퍼짐 그림 배치", () => {
  const count = (dots: { kind: string }[], kind: string) => dots.filter((dot) => dot.kind === kind).length;
  const inside = (dots: { x: number; y: number }[]) =>
    dots.every((dot) => dot.x > 0 && dot.x < SPREAD_VIEW.width && dot.y > 0 && dot.y < SPREAD_VIEW.height);

  it("받은 주소 40곳, 비슷한 금액 34곳 (내 지갑 포함)", () => {
    const { dots, hidden } = spreadLayout(40, 34);
    assert.equal(dots.length, 40);
    assert.equal(hidden, 0);
    assert.equal(count(dots, "mine"), 1);
    assert.equal(count(dots, "similar"), 33);
    assert.equal(count(dots, "other"), 6);
    assert.ok(inside(dots));
  });

  it("점이 너무 많으면 일부만 그리고 나머지 수를 돌려줌", () => {
    const { dots, hidden } = spreadLayout(600, 590);
    assert.equal(dots.length, 48);
    assert.equal(hidden, 552);
    assert.equal(count(dots, "mine"), 1);
    assert.ok(inside(dots));
  });

  it("받은 곳이 내 지갑뿐이어도 그림이 깨지지 않음", () => {
    assert.deepEqual(spreadLayout(1, 1).dots.map((dot) => dot.kind), ["mine"]);
    assert.deepEqual(spreadLayout(0, 0).dots.map((dot) => dot.kind), ["mine"]);
  });
});
