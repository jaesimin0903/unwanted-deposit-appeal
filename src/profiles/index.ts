// 거래소 프로필 (어디에, 무엇을, 언제까지 내나)
// 화면과 서버가 같이 씁니다. 비밀값이 없어서 server-only가 아닙니다.
// 채우는 방법: src/profiles/README.md

export { DOCUMENT_HINTS, DOCUMENT_LABELS } from "@/profiles/documents";
export { GROUPS } from "@/profiles/groups";
export {
  DOCUMENT_STATUS_LABELS,
  OBJECTION_LABELS,
  REQUEST_TYPE_LABELS,
  RESTRICTION_DESCRIPTIONS,
  RESTRICTION_LABELS,
  SCOPE_LABELS,
  requestTypeLabel,
} from "@/profiles/labels";
export { PROFILE_ORDER, PROFILES, exchangeLabel, getProfile } from "@/profiles/registry";
export { getSubmissionRoute, todayInSeoul } from "@/profiles/route";
