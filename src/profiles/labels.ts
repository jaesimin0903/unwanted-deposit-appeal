import type {
  AppealRequestType,
  DocumentStatus,
  ObjectionGround,
  RestrictionScope,
  RestrictionType,
} from "@/types/case";

// 화면과 보고서가 같이 쓰는 이름

export const RESTRICTION_LABELS: Record<RestrictionType, string> = {
  internal: "거래소 내부 심사",
  sanction: "제재에 따른 자산 동결",
  phishing: "보이스피싱 법정 지급정지",
  unknown: "아직 모름",
};

export const RESTRICTION_DESCRIPTIONS: Record<RestrictionType, string> = {
  internal: "거래소가 자체 기준으로 막고 자료를 요청한 경우 (예: 이상거래 감지, 자금 출처 소명 요청)",
  sanction: "제재 대상과 연결된 자금이라 법에 따라 동결한 경우",
  phishing: "피해 신고가 들어와 법에 따라 지급정지된 경우",
  unknown: "통지에 유형이 없거나 무슨 제한인지 알기 어려운 경우",
};

export const SCOPE_LABELS: Record<RestrictionScope, string> = {
  deposit: "문제 입금만 반영 안 됨",
  withdraw: "출금 제한",
  account: "계정 전체 제한",
  unknown: "모름",
};

export const REQUEST_TYPE_LABELS: Record<AppealRequestType, { label: string; description: string }> = {
  account: {
    label: "계정 · 기존 잔액 재검토",
    description: "모르는 입금은 묶여 있어도 괜찮다고 쓰고, 기존 잔액과 계정 기능을 다시 봐 달라고 요청합니다.",
  },
  fund: {
    label: "문제 입금 보류 해제",
    description: "모르는 입금까지 묶은 근거를 묻고, 근거에 오류가 있으면 풀어 달라고 요청합니다.",
  },
};

// 계정 재검토는 받은 제한의 범위와 같은 말로 부릅니다 (소명서 제목 appealTitle과 맞춤).
// 통지에 "출금 제한"이라고 왔으면 선택지도 "출금 제한 재검토"여야 사용자가 바로 알아봅니다.
export function requestTypeLabel(
  requestType: AppealRequestType,
  scope: RestrictionScope,
): { label: string; description: string } {
  if (requestType === "account" && scope === "withdraw") {
    return {
      label: "출금 제한 재검토",
      description: "모르는 입금은 묶여 있어도 괜찮다고 쓰고, 기존 잔액의 출금 제한만 풀어 달라고 요청합니다.",
    };
  }
  if (requestType === "account" && scope === "account") {
    return {
      label: "계정 제한 재검토",
      description: "모르는 입금은 묶여 있어도 괜찮다고 쓰고, 계정 기능과 기존 잔액에 대한 제한을 다시 봐 달라고 요청합니다.",
    };
  }
  return REQUEST_TYPE_LABELS[requestType];
}

export const OBJECTION_LABELS: Record<ObjectionGround, { label: string; description: string }> = {
  notUsed: {
    label: "계정이 사기에 이용되지 않음",
    description: "요청하지 않은 입금이라면 보통 이쪽입니다. 보낸 사람과 거래 관계가 없었다는 자료가 중요합니다.",
  },
  legitimate: {
    label: "정당한 권원으로 받음",
    description:
      "정상적인 거래대금처럼 정당하게 받은 돈인 경우입니다. 명의인이 사기 이용 사실을 알았거나 중대한 과실로 몰랐다고 인정되면 이 사유는 제한됩니다.",
  },
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  onchain: "온체인 기록",
  statement: "본인 설명",
  ready: "별도 첨부",
  needed: "준비 필요",
};
