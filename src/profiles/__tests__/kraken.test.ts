// Kraken 프로필 테스트
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kraken } from "@/profiles/exchanges/kraken";

// src/profiles/README.md "칸 순서" (해외 거래소는 10번째 칸이 제재 동결)
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

describe("Kraken 프로필", () => {
  it("확인한 칸의 출처는 Kraken 공식 지원 문서 링크다", () => {
    for (const field of kraken.fields.filter((item) => item.status === "verified")) {
      assert.match(field.source?.url ?? "", /^https:\/\/support\.kraken\.com\/articles\//, field.label);
    }
  });

  it("표준 칸 이름이 표준 순서대로 모두 있고, 주의 칸은 맨 뒤에 있다", () => {
    const labels = kraken.fields.map((field) => field.label);
    assert.deepEqual(
      labels.filter((label) => STANDARD_LABELS.includes(label)),
      STANDARD_LABELS,
    );
    assert.equal(kraken.fields.at(-1)?.status, "caution");
  });

  it("심사 기간과 제출 기한을 따로 적는다", () => {
    assert.ok(kraken.reviewPeriod?.includes("심사 기간"));
    const review = kraken.fields.find((field) => field.label === "심사 기간");
    const deadline = kraken.fields.find((field) => field.label === "제출 기한");
    assert.ok(review && deadline);
    assert.notEqual(review, deadline);
  });

  it("공개 자료에서 찾지 못한 칸은 확인 필요로 남긴다", () => {
    const unsolicited = kraken.fields.find((field) => field.label === "출처 불분명 입금");
    assert.equal(unsolicited?.status, "check");
    assert.equal(unsolicited?.source, undefined);
    assert.equal(unsolicited?.value, "공개 자료에서 찾지 못했습니다.");
  });
});
