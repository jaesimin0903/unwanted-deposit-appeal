// 제한 유형 · 요청 유형에 따라 바뀌는 소명서 부분 (제목, 요청 사항, 제출 자료 목록)
// 비밀값이 없는 순수 함수라 server-only가 아닙니다. 테스트: __tests__/appeal.test.ts
//
// 원칙 (docs/writing-rules.md)
//   - 요청 사항은 사용자의 요청이라 온체인 기록과 섞지 않습니다.
//   - "결백", "무관" 같은 판단하는 말을 쓰지 않습니다.

import { DOCUMENT_LABELS, getProfile } from "@/profiles";
import type {
  AppealDocumentId,
  ExchangeProfile,
  ReportDocument,
  SubmissionDetails,
  UserStatement,
} from "@/types/case";

// 예전 화면이 보낸 값에는 새 칸이 없을 수 있어서 기본값을 채웁니다.
export function normalizeSubmission(input: Partial<SubmissionDetails> | undefined): SubmissionDetails {
  const exchange = getProfile(input?.exchange) ? input!.exchange! : "unspecified";
  return {
    exchange,
    restrictionType: input?.restrictionType ?? "unknown",
    scope: input?.scope ?? "unknown",
    noticeDate: input?.noticeDate ?? "",
    baseDate: input?.baseDate ?? "",
    requestText: input?.requestText ?? "",
    requestType: input?.requestType ?? "account",
    objectionGround: input?.objectionGround ?? "notUsed",
    availableDocuments: Array.isArray(input?.availableDocuments)
      ? input!.availableDocuments!.filter((id): id is AppealDocumentId =>
          Object.prototype.hasOwnProperty.call(DOCUMENT_LABELS, id),
        )
      : [],
  };
}

export function appealTitle(submission: SubmissionDetails): string {
  switch (submission.restrictionType) {
    case "unknown":
      return "제한 내용 확인 문의";
    case "phishing":
      return "지급정지 이의제기 자료";
    default:
      return submission.requestType === "fund" ? "문제 입금 보류 재확인 요청" : ACCOUNT_REVIEW[submission.scope].title;
  }
}

// 계정 · 기존 잔액 재검토는 받은 제한의 범위에 맞춰 부릅니다.
// 통지에 "출금 제한"이라고 왔으면 소명서도 같은 말을 써야 담당자와 사용자가 같은 것을 가리킵니다.
const ACCOUNT_REVIEW: Record<SubmissionDetails["scope"], { title: string; target: string }> = {
  withdraw: { title: "출금 제한 재검토 요청", target: "기존 잔액에 대한 출금 제한" },
  account: { title: "계정 제한 재검토 요청", target: "계정 기능과 기존 잔액에 대한 제한" },
  deposit: { title: "계정 · 기존 잔액 재검토 요청", target: "기존 잔액과 계정 기능에 대한 제한" },
  unknown: { title: "계정 · 기존 잔액 재검토 요청", target: "기존 잔액과 계정 기능에 대한 제한" },
};

const REVIEW_LEAD =
  "위 온체인 기록과 본인 설명을 구분해 정리했습니다. 각 항목의 원본 링크로 기록을 직접 확인해 주시기 바랍니다.";

export function appealRequest(
  submission: SubmissionDetails,
  input: { amountText: string; senderMatchedSanctions: boolean },
): string {
  const { amountText, senderMatchedSanctions } = input;

  switch (submission.restrictionType) {
    case "unknown":
      return "본인 계정에 적용된 제한의 유형(거래소 내부 심사, 제재에 따른 동결, 법정 지급정지 등)과 제한 범위, 사건번호와 담당 창구, 제출해야 할 자료와 기한을 알려 주시기 바랍니다.";

    case "phishing":
      return submission.objectionGround === "legitimate"
        ? `${REVIEW_LEAD} 본인은 위 자금을 정당한 권원으로 받았다는 사실을 위 자료로 소명하며, 지급정지에 대한 이의를 제기합니다.`
        : `${REVIEW_LEAD} 본인은 계정이 전기통신금융사기에 이용되지 않았다는 사실을 위 자료로 소명하며, 지급정지에 대한 이의를 제기합니다.`;

    default:
      if (submission.requestType === "fund") {
        return [
          REVIEW_LEAD,
          `문제 입금분(${amountText}) 보류의 근거를 알려 주시고, 근거에 오류가 있다면 해제를 검토해 주시기 바랍니다.`,
          senderMatchedSanctions
            ? "보낸 주소가 조회한 제재 목록과 일치하는 경우, 해제에 별도 승인 절차가 필요할 수 있다는 점을 알고 있습니다."
            : "",
        ]
          .filter(Boolean)
          .join(" ");
      }
      return `${REVIEW_LEAD} 본인은 문제 입금분(${amountText}) 보류에 이의가 없습니다. 문제 입금과 구분되는 ${ACCOUNT_REVIEW[submission.scope].target}을 재검토해 주시기 바랍니다.`;
  }
}

const OPTIONAL_DOCUMENTS: AppealDocumentId[] = [
  "bankRecords",
  "otherExchangeRecords",
  "exchangeRecords",
  "counterpartyRecords",
];

// 제출 자료 목록
//   - 거래 해시는 이 자료의 온체인 기록으로 항상 들어갑니다.
//   - 입금 경위는 사용자 설명이 있으면 "사용자 설명", 없으면 "준비 필요"
//   - 나머지는 거래소가 요청하거나 사용자가 준비했다고 표시한 것만 넣습니다.
export function appealDocuments(input: {
  submission: SubmissionDetails;
  statement: UserStatement;
  profile?: ExchangeProfile | null;
}): ReportDocument[] {
  const { submission, statement } = input;
  const profile = input.profile === undefined ? getProfile(submission.exchange) : input.profile;
  const requested = new Set(profile?.requestedDocuments ?? []);
  const ready = new Set(submission.availableDocuments);
  const requestedNote = (id: AppealDocumentId) =>
    requested.has(id) && profile?.status === "verified" ? `${profile.name} 요청 항목` : "";

  const answered =
    [statement.requestedTransfer, statement.knowsSender, statement.hadPurpose].some((answer) => answer !== null) ||
    statement.note.trim().length > 0;

  const documents: ReportDocument[] = [
    { id: "txHash", label: DOCUMENT_LABELS.txHash, status: "onchain", note: requestedNote("txHash") },
    {
      id: "depositReason",
      label: DOCUMENT_LABELS.depositReason,
      status: answered ? "statement" : "needed",
      note: requestedNote("depositReason"),
    },
  ];

  for (const id of OPTIONAL_DOCUMENTS) {
    if (!requested.has(id) && !ready.has(id)) continue;
    documents.push({ id, label: DOCUMENT_LABELS[id], status: ready.has(id) ? "ready" : "needed", note: requestedNote(id) });
  }
  return documents;
}
