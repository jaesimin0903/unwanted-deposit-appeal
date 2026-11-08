// 시연 시나리오: 1단계 "예시 통지 넣기" · "예시로 채우기", 4 · 5단계의 "파일 넣기"와 "직접 설명하기"의 시작 문장 버튼을 누르면
// 예시 자료를 바로 넣습니다.
//
//   - 예시 파일은 public/scenario/에 있고, 데모 데이터(src/fixtures/demo-case.ts)와 같은 날짜 · 금액 · 가짜 주소를 씁니다.
//     모든 파일에 "시연용 예시 · 실제 자료 아님"이 크게 적혀 있습니다.
//   - 실제 자료를 받는 화면으로 돌리려면 SCENARIO_MODE를 false로 바꿉니다. 파일 고르기 창과 빈 시작 문장으로 돌아갑니다.
//   - 시나리오 중에도 내 파일을 칸에 끌어 놓거나 "+ 더 넣기"로 고를 수 있습니다.
// 테스트: __tests__/scenario.test.ts

import type { SlotId } from "@/features/case/attachments";
import { formatKoreanDate, shortAddress } from "@/features/case/utils";
import type { Answer, RestrictionScope, Transfer } from "@/types/case";

export const SCENARIO_MODE = true;

// 1단계 예시 통지 (예시 파일 notice.png와 같은 문구 · 날짜). 통지 문구에서 거래소 · 막힌 범위 · 제한 종류 · 기한을 읽어 채웁니다.
export const SAMPLE_NOTICE = {
  receivedOn: "2026-11-05", // 통지받은 날
  deadline: "2026-11-14", // 자료 제출 기한 (문구 안의 날짜와 같음)
  scope: "withdraw" as RestrictionScope,
};
// 국내 거래소는 "1:1 문의", 해외 거래소는 창구가 채팅 · 티켓이라 "고객센터"로 씁니다
export const sampleNoticeText = (exchangeName: string, domestic = true) =>
  `[${exchangeName}] 회원님 계정에서 이상거래가 감지되어 디지털 자산 출금이 제한되었습니다. 2026년 11월 14일까지 ${
    domestic ? "고객센터 1:1 문의" : "고객센터"
  }로 자금 출처 소명 자료를 제출해 주세요.`;

// 칸마다 넣을 예시 파일. name은 화면과 소명서에 보이는 파일 이름입니다.
export const SAMPLE_FILES: Record<SlotId, { path: string; name: string }> = {
  bankRecords: { path: "/scenario/bank-statement.pdf", name: "은행-거래내역-2026-10.pdf" },
  otherExchangeRecords: { path: "/scenario/other-exchange.png", name: "다른-거래소-입출금내역.png" },
  exchangeRecords: { path: "/scenario/exchange-history.png", name: "거래소-입출금-거래내역.png" },
  counterpartyRecords: { path: "/scenario/counterparty-chat.png", name: "구매자-대화내역.png" },
  notice: { path: "/scenario/notice.png", name: "출금제한-알림.png" },
  account: { path: "/scenario/account.jpg", name: "내-계정-화면.jpg" },
  other: { path: "/scenario/support-chat.png", name: "고객센터-문의-대화.png" },
};

// 같은 칸을 다시 눌러도 같은 파일로 보이게 수정 시각을 고정합니다 (CaseWorkspace가 이름 · 크기 · 시각으로 중복을 거릅니다)
const SAMPLE_MODIFIED = Date.parse("2026-11-06T00:00:00Z");

export async function fetchSampleFile(slot: SlotId): Promise<File> {
  const sample = SAMPLE_FILES[slot];
  const response = await fetch(sample.path);
  if (!response.ok) throw new Error(`예시 파일을 불러오지 못했습니다 (${response.status})`);
  const blob = await response.blob();
  return new File([blob], sample.name, { type: blob.type, lastModified: SAMPLE_MODIFIED });
}

// 5단계 신청인 칸의 예시 (예시 계정 화면 account.jpg와 같은 가짜 정보)
export const SAMPLE_APPLICANT = { name: "홍길동", account: "hong@example.com", contact: "010-0000-0000" };

export interface NoteContext {
  exchangeName: string | null;
  noticeDate: string; // YYYY-MM-DD, 모르면 ""
  transfer: Transfer | undefined;
  knowsSender: Answer;
  firstOutgoingTitle: string | null; // 온체인 조사의 "입금 후 본인 지갑의 첫 전송" 제목
}

// "직접 설명하기" 시작 문장 뒤에 이어 넣을 예시 설명. 본인이 아는 사실만 말하는 문장으로 씁니다 (docs/writing-rules.md).
export function sampleNoteText(starter: string, context: NoteContext): string {
  const { exchangeName, noticeDate, transfer, knowsSender, firstOutgoingTitle } = context;
  const deposit = transfer ? `${formatKoreanDate(transfer.timestamp)}에 ${transfer.displayValue} ${transfer.asset} 입금` : "모르는 입금";

  if (starter === "처음 알게 된 경위") {
    const [, month, day] = /^\d{4}-(\d{2})-(\d{2})$/.exec(noticeDate) ?? [];
    const when = month ? `${Number(month)}월 ${Number(day)}일 ` : "";
    return `${when}${exchangeName ?? "거래소"} 알림을 받고 출금이 제한된 것을 알았습니다. 입금 내역을 확인해 보니 ${deposit}이 있었습니다.`;
  }
  if (starter === "보낸 사람에 대해 아는 것") {
    if (knowsSender === "yes") return "보낸 사람은 중고 거래로 알게 된 구매자입니다. 주고받은 메시지를 첨부했습니다.";
    const sender = transfer ? `보낸 주소(${shortAddress(transfer.from, 6, 4)})` : "보낸 주소";
    if (knowsSender === "unknown") return `${sender}의 주인이 누구인지 모릅니다. 연락하거나 거래한 기억이 없습니다.`;
    return `${sender}는 처음 보는 주소입니다. 이 주소의 주인과 연락하거나 거래한 적이 없습니다.`;
  }
  if (starter === "입금 후 한 일") {
    if (firstOutgoingTitle) {
      return `온체인 조사에 「${firstOutgoingTitle}」라고 나온 전송은 본인 명의 다른 거래소 계정으로 옮긴 것입니다. 그 거래소의 입출금 내역을 첨부했습니다.`;
    }
    return "입금 뒤에는 거래소 안내를 기다리며 지갑을 그대로 두었습니다.";
  }
  return "";
}
