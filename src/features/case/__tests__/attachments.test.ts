// 첨부할 자료 칸(순서, 요청 표시)과 파일 → 제출 자료 연결 테스트
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptedType,
  attachmentMeta,
  attachmentSlots,
  documentsWithFiles,
  formatSize,
  type PreparedFile,
} from "@/features/case/attachments";
import type { ExchangeProfile } from "@/types/case";

const profile: ExchangeProfile = {
  id: "upbit",
  name: "테스트거래소",
  group: "kr",
  status: "verified",
  language: "ko",
  channel: "1:1 문의",
  reviewPeriod: null,
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords"],
  fields: [],
  checkedAt: "2026-11-07",
};

const file = (slot: PreparedFile["slot"], name: string): PreparedFile => ({
  id: `${slot}:${name}`,
  slot,
  name,
  size: 2048,
  type: "application/pdf",
  url: `blob:${name}`,
});

describe("첨부할 자료 칸", () => {
  it("요청 항목 · 자금 출처 자료가 먼저 오고, 통지 · 계정 화면 · 그 밖의 자료가 뒤에 옴", () => {
    const slots = attachmentSlots({
      submission: { exchange: "upbit", requestText: "자금 출처 소명 자료를 제출해 주세요" },
      profile,
      asksSourceOfFunds: true,
    });
    assert.deepEqual(
      slots.map((slot) => slot.id),
      ["bankRecords", "otherExchangeRecords", "exchangeRecords", "counterpartyRecords", "notice", "account", "other"],
    );
    assert.equal(slots[0].requestedBy, "테스트거래소 요청 항목");
    assert.equal(slots[2].requestedBy, null);
    assert.equal(slots[2].sourceOfFunds, true);
    assert.deepEqual(slots.filter((slot) => slot.wanted).map((slot) => slot.id), ["bankRecords", "otherExchangeRecords", "exchangeRecords"]);
  });

  it("리서치 중인 프로필의 요청 자료는 요청 항목으로 표시하지 않음", () => {
    const slots = attachmentSlots({
      submission: { exchange: "upbit", requestText: "" },
      profile: { ...profile, status: "research" },
      asksSourceOfFunds: false,
    });
    assert.ok(slots.every((slot) => !slot.wanted));
    assert.ok(!slots.some((slot) => slot.id === "notice"), "통지 문구가 없으면 통지 화면 칸도 없음");
  });

  it("거래소를 고르지 않으면 계정 화면 칸이 없음", () => {
    const slots = attachmentSlots({ submission: { exchange: "unspecified", requestText: "" }, profile: null, asksSourceOfFunds: false });
    assert.deepEqual(slots.slice(-1).map((slot) => slot.id), ["other"]);
    assert.ok(!slots.some((slot) => slot.id === "account"));
  });
});

describe("넣은 파일 → 제출 자료", () => {
  it("파일이 들어간 자료 종류만 준비한 자료가 됨 (그 밖의 칸은 자료 종류가 아님)", () => {
    const files = [file("bankRecords", "a.pdf"), file("bankRecords", "b.pdf"), file("notice", "c.png"), file("exchangeRecords", "d.pdf")];
    assert.deepEqual(documentsWithFiles(files), ["bankRecords", "exchangeRecords"]);
  });

  it("서버에는 이름 · 크기 · 형식만 보냄", () => {
    const [meta] = attachmentMeta([file("other", "a.pdf")]);
    assert.deepEqual(Object.keys(meta).sort(), ["id", "name", "size", "type"]);
    assert.ok(!("url" in meta));
  });
});

describe("넣을 수 있는 형식", () => {
  it("PDF, JPG, PNG만 받고 형식과 확장자가 다르면 받지 않음", () => {
    assert.equal(acceptedType({ name: "거래내역.PDF", type: "application/pdf" }), "application/pdf");
    assert.equal(acceptedType({ name: "캡처.jpg", type: "image/jpeg" }), "image/jpeg");
    assert.equal(acceptedType({ name: "캡처.png", type: "" }), "image/png");
    assert.equal(acceptedType({ name: "그림.svg", type: "image/svg+xml" }), null);
    assert.equal(acceptedType({ name: "메모.txt", type: "text/plain" }), null);
    assert.equal(acceptedType({ name: "가짜.pdf", type: "image/png" }), null);
  });

  it("크기 표시", () => {
    assert.equal(formatSize(300), "1 KB");
    assert.equal(formatSize(312 * 1024), "312 KB");
    assert.equal(formatSize(2.5 * 1024 * 1024), "2.5 MB");
  });
});
