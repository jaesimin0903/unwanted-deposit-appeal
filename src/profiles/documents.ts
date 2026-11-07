import type { AppealDocumentId } from "@/types/case";

// 소명할 때 낼 수 있는 자료 이름. 프로필의 requestedDocuments가 이 키를 씁니다.
export const DOCUMENT_LABELS: Record<AppealDocumentId, string> = {
  txHash: "문제 입금의 거래 번호(TxID)",
  depositReason: "입금 경위 설명",
  bankRecords: "금융기관 거래내역 · 이체확인증",
  otherExchangeRecords: "다른 가상자산거래소 거래내역",
  exchangeRecords: "이 거래소의 입출금 · 거래내역",
  counterpartyRecords: "상대방 연락 기록 · 주문 내역",
};

// "준비한 자료"에서 각 자료가 무엇인지 한 줄로 알려 줍니다
export const DOCUMENT_HINTS: Record<AppealDocumentId, string> = {
  txHash: "입금 찾기에서 고른 거래의 해시입니다. 자동으로 들어갑니다.",
  depositReason: "내 설명 화면에서 답한 내용입니다. 자동으로 들어갑니다.",
  bankRecords: "원화 입출금이 있었다면 은행 거래내역이나 이체확인증",
  otherExchangeRecords: "다른 거래소에서 이 지갑으로 보냈거나 받은 기록",
  exchangeRecords: "이 거래소 앱에서 내려받은 입출금 · 거래 내역 (원화로 산 잔액이라면 매수 내역)",
  counterpartyRecords: "거래 상대와 주고받은 메시지, 주문서, 계약서",
};
