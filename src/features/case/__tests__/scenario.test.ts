// 시연 시나리오: 칸마다 예시 파일이 있고, 예시 설명이 문장 규칙을 지키는지
// 실행: npm test

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SLOT_LABELS, acceptedType, type SlotId } from "@/features/case/attachments";
import { parseNotice } from "@/features/case/notice";
import { SAMPLE_FILES, SAMPLE_NOTICE, sampleNoteText, sampleNoticeText, type NoteContext } from "@/features/case/scenario";
import { DEMO_DUST } from "@/fixtures/demo-case";

const STARTERS = ["처음 알게 된 경위", "보낸 사람에 대해 아는 것", "입금 후 한 일"];
const BANNED = ["결백", "무관", "깨끗한", "안전한", "범죄와 관계없는", "증명됨"]; // docs/writing-rules.md

const context: NoteContext = {
  exchangeName: "업비트",
  noticeDate: "2026-11-05",
  transfer: DEMO_DUST,
  knowsSender: "no",
  firstOutgoingTitle: "입금 10분 뒤 본인 지갑이 다른 주소로 0.3 ETH를 보냈습니다",
};

describe("예시 파일", () => {
  it("모든 칸에 넣을 수 있는 형식의 예시 파일이 있다", () => {
    for (const slot of Object.keys(SLOT_LABELS) as SlotId[]) {
      const sample = SAMPLE_FILES[slot];
      assert.ok(sample, `${slot} 예시 파일 없음`);
      assert.ok(acceptedType({ name: sample.name, type: "" }), `${slot}: ${sample.name} 형식`);
      assert.ok(existsSync(join(process.cwd(), "public", sample.path)), `${sample.path} 파일 없음`);
    }
  });
});

describe("예시 통지", () => {
  it("문구에서 읽히는 거래소 · 범위 · 제한 종류 · 기한이 예시 통지 값과 같다", () => {
    const found = parseNotice(sampleNoticeText("업비트"), "2026-11-08");
    assert.equal(found.exchange, "upbit");
    assert.equal(found.scope, SAMPLE_NOTICE.scope);
    assert.equal(found.restrictionType, "internal");
    assert.equal(found.deadline, SAMPLE_NOTICE.deadline);
    assert.ok(found.asksSourceOfFunds);
  });

  it("고른 거래소 이름으로 넣으면 그 거래소로 읽힌다", () => {
    const found = parseNotice(sampleNoticeText("Binance", false), "2026-11-08");
    assert.equal(found.exchange, "binance");
    assert.equal(found.deadline, SAMPLE_NOTICE.deadline);
    assert.ok(!sampleNoticeText("Binance", false).includes("1:1 문의"));
  });
});

describe("예시 설명", () => {
  it("시작 문장마다 설명이 있고, 쓰지 않는 말이 없다", () => {
    for (const knowsSender of ["no", "yes", "unknown", null] as const) {
      for (const starter of STARTERS) {
        const text = sampleNoteText(starter, { ...context, knowsSender });
        assert.ok(text.length > 0, `${starter} 비어 있음`);
        for (const word of BANNED) assert.ok(!text.includes(word), `${starter}: "${word}"`);
      }
    }
  });

  it("입금 금액 · 거래소 이름 · 보낸 주소를 데이터에서 가져온다", () => {
    const first = sampleNoteText("처음 알게 된 경위", context);
    assert.match(first, /^11월 5일 업비트 알림/);
    assert.match(first, /0\.001 ETH 입금이 있었습니다/);
    assert.match(sampleNoteText("보낸 사람에 대해 아는 것", context), /0x9999…9999/);
    assert.match(sampleNoteText("입금 후 한 일", context), /0\.3 ETH를 보냈습니다」라고 나온 전송/);
  });

  it("조사 결과가 없으면 일반 문장으로 넣는다", () => {
    const bare = { exchangeName: null, noticeDate: "", transfer: undefined, knowsSender: null, firstOutgoingTitle: null };
    assert.match(sampleNoteText("처음 알게 된 경위", bare), /^거래소 알림.*모르는 입금이 있었습니다/);
    assert.equal(sampleNoteText("입금 후 한 일", bare), "입금 뒤에는 거래소 안내를 기다리며 지갑을 그대로 두었습니다.");
    assert.equal(sampleNoteText("없는 시작 문장", bare), "");
  });
});
