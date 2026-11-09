// Binance 프로필 테스트
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { binance } from "@/profiles/exchanges/binance";

// src/profiles/README.md "칸 순서". 해외 거래소는 10번째 자리에 "제재 동결"을 둡니다.
const STANDARD_LABELS = [
  "판단 방식",
  "제출 창구",
  "요청 자료",
  "이의신청",
  "심사 기간",
  "제한 사유",
  "제한 통지",
  "해제 조건",
  "차단 기간",
  "제재 동결",
  "출처 불분명 입금",
];

describe("Binance 프로필", () => {
  it("확인한 칸의 출처는 Binance 공식 FAQ 링크다", () => {
    for (const field of binance.fields.filter((item) => item.status === "verified")) {
      assert.match(field.source?.url ?? "", /^https:\/\/www\.binance\.com\/en\/support\/faq\//, field.label);
    }
  });

  it("공개 자료에서 심사 기간을 찾지 못했으면 심사 기간을 비워 둔다", () => {
    const review = binance.fields.find((field) => field.label === "심사 기간");
    assert.equal(review?.status, "check");
    assert.equal(binance.reviewPeriod, null);
  });

  it("공개 자료에서 찾지 못한 칸에는 출처를 붙이지 않는다", () => {
    for (const field of binance.fields.filter((item) => item.status === "check")) {
      assert.equal(field.source, undefined, field.label);
      assert.equal(field.value, "공개 자료에서 찾지 못했습니다.", field.label);
    }
  });

  it("기본 칸은 README 순서대로 놓이고 주의 칸은 맨 뒤에 있다", () => {
    const labels = binance.fields.map((field) => field.label);
    const positions = STANDARD_LABELS.map((label) => labels.indexOf(label));
    positions.forEach((position, index) => assert.notEqual(position, -1, `${STANDARD_LABELS[index]} 칸이 없음`));
    assert.deepEqual(
      positions,
      [...positions].sort((a, b) => a - b),
      "기본 칸 순서가 README와 다름",
    );

    const firstCaution = binance.fields.findIndex((field) => field.status === "caution");
    if (firstCaution !== -1) {
      assert.ok(binance.fields.slice(firstCaution).every((field) => field.status === "caution"), "주의 칸 뒤에 다른 칸이 있음");
    }
  });
});
