// 안내문 읽기(parseNotice) 테스트: 분명히 적힌 것만 제안하는지 확인합니다.
// 실행: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNotice } from "@/features/case/notice";

const TODAY = "2026-11-07";

describe("parseNotice", () => {
  it("업비트 출금 제한 안내문을 읽는다", () => {
    const text =
      "[업비트] 회원님 계정에서 이상거래가 감지되어 디지털 자산 출금이 제한되었습니다. 2026년 11월 14일까지 고객센터 1:1 문의로 자금 출처 소명 자료를 제출해 주세요.";
    assert.deepEqual(parseNotice(text, TODAY), {
      restrictionType: "internal",
      scope: "withdraw",
      exchange: "upbit",
      deadline: "2026-11-14",
      asksSourceOfFunds: true,
      found: ["업비트", "출금 제한", "기한 2026-11-14", "거래소 내부 심사로 보임"],
    });
  });

  it("지급정지와 채권소멸절차가 있으면 보이스피싱으로 본다", () => {
    const hints = parseNotice("전기통신금융사기 신고로 지급정지 되었으며 채권소멸절차가 진행됩니다.", TODAY);
    assert.equal(hints.restrictionType, "phishing");
    assert.ok(hints.found.includes("보이스피싱 법정 지급정지로 보임"));
  });

  it("제재 문구는 sanction, 보이스피싱 문구가 함께 있으면 phishing이 이긴다", () => {
    assert.equal(parseNotice("OFAC 제재 대상과 연관되어 자산이 동결되었습니다.", TODAY).restrictionType, "sanction");
    assert.equal(parseNotice("제재 및 지급정지 안내", TODAY).restrictionType, "phishing");
  });

  it("연도 없는 지난 날짜는 다음 해로 본다", () => {
    assert.equal(parseNotice("11월 3일까지 제출", TODAY).deadline, "2027-11-03");
  });

  it("연도 없는 앞으로의 날짜는 올해로 본다", () => {
    assert.equal(parseNotice("12월 1일까지 제출", TODAY).deadline, "2026-12-01");
  });

  it("점으로 쓴 날짜는 0을 채운다", () => {
    assert.equal(parseNotice("2026.1.5까지 제출", TODAY).deadline, "2026-01-05");
  });

  it("까지가 없는 날짜는 무시한다", () => {
    const hints = parseNotice("2026년 11월 1일에 출금이 제한되었습니다.", TODAY);
    assert.equal(hints.deadline, undefined);
    assert.ok(!hints.found.some((label) => label.startsWith("기한")));
  });

  it("까지가 붙은 첫 날짜만 쓴다", () => {
    assert.equal(parseNotice("2026-10-01 접수, 2026-11-20까지, 2026-12-01까지", TODAY).deadline, "2026-11-20");
  });

  it("계정 정지는 계정 전체 제한이다", () => {
    const hints = parseNotice("고객님의 계정이 정지되었습니다.", TODAY);
    assert.equal(hints.scope, "account");
    assert.ok(hints.found.includes("계정 전체 제한"));
  });

  it("입금 보류는 문제 입금만 반영 안 됨이다", () => {
    const hints = parseNotice("해당 입금이 보류 처리되었습니다.", TODAY);
    assert.equal(hints.scope, "deposit");
    assert.ok(hints.found.includes("문제 입금만 반영 안 됨"));
  });

  it("거래소 이름은 영문 대소문자를 가리지 않는다", () => {
    assert.equal(parseNotice("Your BINANCE account", TODAY).exchange, "binance");
    assert.equal(parseNotice("디지털엑스 안내", TODAY).exchange, "korbit");
  });

  it("자금 출처 요청 여부를 읽는다", () => {
    assert.equal(parseNotice("자금출처를 알려 주세요", TODAY).asksSourceOfFunds, true);
    assert.equal(parseNotice("출금이 제한되었습니다", TODAY).asksSourceOfFunds, false);
  });

  it("빈 글이나 공백만 있으면 아무것도 제안하지 않는다", () => {
    assert.deepEqual(parseNotice("", TODAY), { asksSourceOfFunds: false, found: [] });
    assert.deepEqual(parseNotice("  \n ", TODAY), { asksSourceOfFunds: false, found: [] });
  });
});
