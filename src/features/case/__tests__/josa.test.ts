// 거래소 이름 뒤 조사 (빗썸이 / 업비트가 …)
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withJosa } from "@/features/case/utils";

describe("withJosa", () => {
  it("화면에 나오는 거래소 이름마다 맞는 조사를 붙인다", () => {
    const expected: Record<string, string> = {
      업비트: "업비트가",
      빗썸: "빗썸이",
      코인원: "코인원이",
      코빗: "코빗이",
      고팍스: "고팍스가",
      Kraken: "Kraken이",
      Coinbase: "Coinbase가",
      Binance: "Binance가",
    };
    for (const [name, joined] of Object.entries(expected)) assert.equal(withJosa(name, "이", "가"), joined);
  });

  it("은/는도 같은 규칙", () => {
    assert.equal(withJosa("빗썸", "은", "는"), "빗썸은");
    assert.equal(withJosa("업비트", "은", "는"), "업비트는");
  });
});
