// 제한 유형 · 요청 유형에 따라 바뀌는 소명서 부분 테스트
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { researchProfile } from "@/profiles/build";
import { appealDocuments, appealRequest, appealTitle, normalizeSubmission } from "@/server/report/appeal";
import type { ExchangeProfile, UserStatement } from "@/types/case";

// 실제 거래소 프로필 대신 쓰는 고정 프로필입니다.
// 국내 · 해외 담당이 프로필을 채워도 이 공용 테스트를 고칠 일이 없게 하려는 것입니다 (CONTRIBUTING.md).
const verifiedProfile: ExchangeProfile = {
  ...researchProfile("upbit", "업비트", "kr"),
  status: "verified",
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords"],
};
const researchingProfile = researchProfile("bithumb", "빗썸", "kr");

const blankStatement: UserStatement = {
  requestedTransfer: null,
  knowsSender: null,
  hadPurpose: null,
  discoveredAt: "",
  note: "",
  attachments: [],
};

const base = normalizeSubmission({ exchange: "upbit", restrictionType: "internal" });
const amountInput = { amountText: "0.001 ETH", senderMatchedSanctions: false };

describe("기본값 채우기", () => {
  it("빠진 칸은 기본값, 모르는 거래소와 자료 키는 버린다", () => {
    const filled = normalizeSubmission({ exchange: "other" as never, availableDocuments: ["bankRecords", "toString" as never] });
    assert.equal(filled.exchange, "unspecified");
    assert.equal(filled.restrictionType, "unknown");
    assert.equal(filled.requestType, "account");
    assert.deepEqual(filled.availableDocuments, ["bankRecords"]);
  });
});

describe("제목과 요청 사항", () => {
  it("모름이면 확인 문의", () => {
    const submission = { ...base, restrictionType: "unknown" as const };
    assert.equal(appealTitle(submission), "제한 내용 확인 문의");
    assert.match(appealRequest(submission, amountInput), /제한의 유형/);
  });

  it("계정 재검토는 문제 입금 보류에 이의가 없다고 쓴다", () => {
    assert.equal(appealTitle(base), "계정 · 기존 잔액 재검토 요청");
    assert.match(appealRequest(base, amountInput), /보류에 이의가 없습니다/);
  });

  it("보류 해제 요청에서 제재 목록이 일치하면 별도 절차를 알린다", () => {
    const submission = { ...base, requestType: "fund" as const };
    assert.equal(appealTitle(submission), "문제 입금 보류 재확인 요청");
    assert.match(appealRequest(submission, { ...amountInput, senderMatchedSanctions: true }), /별도 승인 절차/);
    assert.doesNotMatch(appealRequest(submission, amountInput), /별도 승인 절차/);
  });

  it("보이스피싱은 이의 사유에 따라 문장이 다르다", () => {
    const submission = { ...base, restrictionType: "phishing" as const };
    assert.equal(appealTitle(submission), "지급정지 이의제기 자료");
    assert.match(appealRequest(submission, amountInput), /사기에 이용되지 않았다는/);
    assert.match(appealRequest({ ...submission, objectionGround: "legitimate" }, amountInput), /정당한 권원/);
  });

  it("판단하는 말을 쓰지 않는다", () => {
    for (const restrictionType of ["internal", "sanction", "phishing", "unknown"] as const) {
      for (const requestType of ["account", "fund"] as const) {
        const text = appealRequest({ ...base, restrictionType, requestType }, amountInput);
        assert.doesNotMatch(text, /결백|무관|깨끗|안전한/);
      }
    }
  });
});

describe("제출 자료 목록", () => {
  it("거래 해시는 항상 온체인 기록, 설명이 없으면 경위는 준비 필요", () => {
    const docs = appealDocuments({ submission: base, statement: blankStatement });
    assert.equal(docs.find((doc) => doc.id === "txHash")?.status, "onchain");
    assert.equal(docs.find((doc) => doc.id === "depositReason")?.status, "needed");
  });

  it("거래소가 요청한 자료는 요청 항목으로 표시하고, 준비한 자료는 준비함", () => {
    const docs = appealDocuments({
      submission: { ...base, availableDocuments: ["bankRecords"] },
      statement: { ...blankStatement, requestedTransfer: "no" },
      profile: verifiedProfile,
    });
    const bank = docs.find((doc) => doc.id === "bankRecords");
    assert.equal(bank?.status, "ready");
    assert.equal(bank?.note, "업비트 요청 항목");
    assert.equal(docs.find((doc) => doc.id === "otherExchangeRecords")?.status, "needed");
    assert.equal(docs.find((doc) => doc.id === "depositReason")?.status, "statement");
  });

  it("리서치 중인 거래소는 요청 항목이라고 표시하지 않는다", () => {
    const docs = appealDocuments({
      submission: { ...base, exchange: "bithumb" },
      statement: blankStatement,
      profile: researchingProfile,
    });
    assert.ok(docs.every((doc) => doc.note === ""));
  });
});
