// 거래소에 같이 낼 파일 (4단계 "첨부할 자료", 5단계 "같이 낼 자료")
//
// 원칙
//   - 파일 내용은 이 브라우저 메모리(blob URL)에만 둡니다. 서버로 보내지 않고, 새로고침하면 사라집니다.
//   - 서버에는 이름 · 크기 · 형식(UserStatement.attachments)과 파일이 들어간 자료 종류(availableDocuments)만 갑니다.
//   - "준비했다"는 체크 대신, 칸에 파일이 들어 있으면 준비한 것으로 봅니다.
// 테스트: __tests__/attachments.test.ts

import { DOCUMENT_HINTS, DOCUMENT_LABELS } from "@/profiles";
import type { AppealDocumentId, ExchangeProfile, StatementAttachment, SubmissionDetails } from "@/types/case";

// 거래 해시와 입금 경위는 소명서 안에 들어가므로 파일 칸이 없습니다
export type DocumentSlotId = Exclude<AppealDocumentId, "txHash" | "depositReason">;
export type ExtraSlotId = "notice" | "account" | "other";
export type SlotId = DocumentSlotId | ExtraSlotId;

export interface AttachmentSlot {
  id: SlotId;
  label: string;
  hint: string;
  requestedBy: string | null; // 예: "업비트 요청 항목" (공개 자료로 확인한 프로필일 때만)
  sourceOfFunds: boolean; // 통지가 자금 출처 자료를 요구했고, 이 칸이 그 예가 되는 자료
  wanted: boolean; // 거래소 요청 항목이거나 통지가 요구한 자료
}

export interface PreparedFile {
  id: string;
  slot: SlotId;
  name: string;
  size: number;
  type: AcceptedType;
  url: string; // blob: URL. 빼거나 처음부터 다시 할 때 해제합니다
}

const DOCUMENT_SLOTS: DocumentSlotId[] = ["bankRecords", "otherExchangeRecords", "exchangeRecords", "counterpartyRecords"];

// 통지가 "자금 출처" 자료를 요구할 때 그 예가 되는 자료
// (업비트 개인정보처리방침 "자금출처확인": 금융기관 · 타 거래소 거래내역, 원화로 산 잔액이면 이 거래소의 매수 내역)
export const SOURCE_OF_FUNDS_DOCUMENTS: AppealDocumentId[] = ["bankRecords", "otherExchangeRecords", "exchangeRecords"];

const EXTRA_SLOTS: Record<ExtraSlotId, { label: string; hint: string }> = {
  notice: { label: "받은 통지 화면", hint: "알림톡 · 문자 · 이메일로 받은 제한 통지를 캡처한 것" },
  account: { label: "내 계정 화면", hint: "거래소 앱에서 내 계정(이메일 · 이름)이 보이는 화면 캡처" },
  other: { label: "그 밖의 관련 자료", hint: "위 칸에 맞지 않는 자료 (예: 지갑 앱의 입금 알림 캡처)" },
};

export const SLOT_LABELS: Record<SlotId, string> = {
  bankRecords: DOCUMENT_LABELS.bankRecords,
  otherExchangeRecords: DOCUMENT_LABELS.otherExchangeRecords,
  exchangeRecords: DOCUMENT_LABELS.exchangeRecords,
  counterpartyRecords: DOCUMENT_LABELS.counterpartyRecords,
  notice: EXTRA_SLOTS.notice.label,
  account: EXTRA_SLOTS.account.label,
  other: EXTRA_SLOTS.other.label,
};

const isDocumentSlot = (slot: SlotId): slot is DocumentSlotId => (DOCUMENT_SLOTS as SlotId[]).includes(slot);

// 칸 순서: 거래소가 요청했거나 통지가 요구한 자료 → 그 밖의 자료 → 통지 · 계정 화면 → 그 밖의 관련 자료
// 통지 화면은 통지 문구를 넣었을 때, 계정 화면은 거래소를 골랐을 때만 둡니다 (서버의 additionalDocuments와 같은 조건).
export function attachmentSlots(input: {
  submission: Pick<SubmissionDetails, "exchange" | "requestText">;
  profile: ExchangeProfile | null | undefined;
  asksSourceOfFunds: boolean;
}): AttachmentSlot[] {
  const { submission, profile, asksSourceOfFunds } = input;
  const documents = DOCUMENT_SLOTS.map((id): AttachmentSlot => {
    const requestedBy = profile?.status === "verified" && profile.requestedDocuments.includes(id) ? `${profile.name} 요청 항목` : null;
    const sourceOfFunds = asksSourceOfFunds && SOURCE_OF_FUNDS_DOCUMENTS.includes(id);
    return {
      id,
      label: DOCUMENT_LABELS[id],
      hint: DOCUMENT_HINTS[id],
      requestedBy,
      sourceOfFunds,
      wanted: Boolean(requestedBy) || sourceOfFunds,
    };
  });
  const extras: ExtraSlotId[] = [
    ...(submission.requestText.trim() ? (["notice"] as const) : []),
    ...(submission.exchange !== "unspecified" ? (["account"] as const) : []),
    "other",
  ];
  return [
    ...documents.filter((slot) => slot.wanted),
    ...documents.filter((slot) => !slot.wanted),
    ...extras.map((id): AttachmentSlot => ({ id, ...EXTRA_SLOTS[id], requestedBy: null, sourceOfFunds: false, wanted: false })),
  ];
}

// 파일이 하나라도 들어간 자료 종류 → 소명서 제출 자료에서 "별도 첨부"
export function documentsWithFiles(files: PreparedFile[]): AppealDocumentId[] {
  const ids: AppealDocumentId[] = [];
  for (const file of files) {
    if (isDocumentSlot(file.slot) && !ids.includes(file.slot)) ids.push(file.slot);
  }
  return ids;
}

// 서버로 보내는 첨부 정보 (내용 없이 이름 · 크기 · 형식만)
export function attachmentMeta(files: PreparedFile[]): StatementAttachment[] {
  return files.map(({ id, name, size, type }) => ({ id, name, size, type }));
}

// 자료 종류(AppealDocumentId)로도 찾습니다. 거래 해시 · 입금 경위는 칸이 없어서 늘 빈 목록입니다.
export const filesIn = (files: PreparedFile[], slot: SlotId | AppealDocumentId) => files.filter((file) => file.slot === slot);

// 넣을 수 있는 형식: 브라우저가 바로 보여줄 수 있는 PDF, JPG, PNG만 받습니다 (SVG처럼 스크립트가 들어갈 수 있는 형식은 받지 않음)
export type AcceptedType = "application/pdf" | "image/png" | "image/jpeg";
export const ACCEPT_ATTRIBUTE = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

const EXTENSION_TYPES: Record<string, AcceptedType> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// 형식이 비어 오는 브라우저가 있어서 확장자로도 봅니다. 둘이 다르면 받지 않습니다.
export function acceptedType(file: { name: string; type: string }): AcceptedType | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = EXTENSION_TYPES[extension] ?? null;
  if (!file.type) return byExtension;
  const byType = (Object.values(EXTENSION_TYPES) as string[]).includes(file.type) ? (file.type as AcceptedType) : null;
  if (!byType || !byExtension) return null;
  return byType === byExtension ? byType : null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
