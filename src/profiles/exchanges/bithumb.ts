import type { ExchangeProfile } from "@/types/case";

// 빗썸 소명 절차
// 담당: 거래소 프로필 · 국내
// 출처는 빗썸 이용약관(2026-09-01 적용), 개인정보 처리방침(2026-10-30 시행), 고객지원 안내입니다 (2026-11-07 확인).
// 약관 · 처리방침 페이지는 브라우저에서 그려져서 Chrome으로 열어 본문을 저장했고, 고객지원 글은 리더(r.jina.ai)로 받았습니다.
// 약관의 항 · 호 번호는 화면에 숫자로 찍히지 않아 순서로 셌습니다 (빗썸 안내도 "이용약관 제14조제2항"으로 같은 방식).
// 「」 안은 원문 그대로입니다. 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.
// 주의: 약관의 "통지 수령일로부터 7일 이내 이의, 14일 이내 회신"은 제20조(채무 발생에 따른 제한)에만 적용됩니다.

const TERMS = "https://www.bithumb.com/react/terms/info-terms";
const PRIVACY = "https://www.bithumb.com/react/terms/info-customer";
const FDS = "https://support.bithumb.com/hc/ko/articles/51138157110809";
const FDS_LAW = "https://support.bithumb.com/hc/ko/articles/51146510719129";
const OBJECTION = "https://support.bithumb.com/hc/ko/articles/62832731834009";
const RETURN = "https://support.bithumb.com/hc/ko/articles/51142098046361";

export const bithumb: ExchangeProfile = {
  id: "bithumb",
  name: "빗썸",
  group: "kr",
  status: "verified",
  language: "ko",
  channel: "빗썸 고객지원 > 증빙센터 > 자금출처증빙",
  reviewPeriod: null,
  // 개인정보 처리방침 "금융기관 거래(이체)내역, 가상자산거래소 거래(이체)내역, … 자금출처를 입증할 수 있는 서류"
  // 지급정지 이의제기 안내 "거래내역, 입·출금 내역, TXID, 지갑주소, 거래상대방과의 거래내용 등", "거래 경위와 자산 취득 사유"
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords", "exchangeRecords", "counterpartyRecords"],
  fields: [
    {
      label: "판단 방식",
      value:
        "「FDS 심사 과정에서 전기통신금융사기 등 금융사고 예방을 위해 본인 자금 여부 확인을 위한 자금 출처 증빙자료를 요청드릴 수 있으며, 심사 기간 동안 가상자산 출금 서비스 이용이 제한됩니다.」 「제출하신 자료는 담당부서에서 검토 후 결과를 안내드립니다.」",
      status: "verified",
      source: { label: "빗썸 고객지원 · FDS 심사로 출금이 제한되고 자금출처 증빙자료 제출을 요청받았어요", url: FDS },
    },
    {
      label: "제출 창구",
      value: "「자금 출처 증빙자료 제출이 필요한 경우 별도 알림톡을 통해 필요한 자료를 안내드립니다.」 「안내받은 자료는 [고객지원 > 증빙센터 > 자금출처증빙]을 통해 제출해 주시기 바랍니다.」",
      status: "verified",
      source: { label: "빗썸 고객지원 · FDS 심사로 출금이 제한되고 자금출처 증빙자료 제출을 요청받았어요", url: FDS },
    },
    {
      label: "요청 자료",
      value:
        "고객지원 '기타 증빙'으로 받는 항목: 「금융기관 거래(이체)내역, 가상자산거래소 거래(이체)내역, 기타 양도·증여·상속 등 자금출처를 입증할 수 있는 서류」. FDS 건은 알림톡으로 따로 안내합니다.",
      status: "verified",
      source: { label: "빗썸 개인정보 처리방침 (2026-10-30 시행)", url: PRIVACY },
    },
    {
      label: "이의신청",
      value: "「회원은 회사의 서비스 이용 제한에 대해 이의를 제기할 수 있습니다.」 (이용약관 제13조 ⑤) 일반 이용 제한의 이의 방법과 기한은 약관에 없습니다.",
      status: "verified",
      source: { label: "빗썸 이용약관 제13조 (2026-09-01 적용)", url: TERMS },
    },
    { label: "심사 기간", value: "소명 · 이의의 심사 기간은 공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "제한 사유",
      value:
        "「회원의 가상자산 또는 원화가 자금세탁 또는 불법자금 수수 등과 관련 있거나 관련성이 있다고 합리적으로 의심되는 경우」(제14조 ② 6호), 「수사기관, 법원, 금융회사 및 기타 권한있는 기관으로부터 관계 법령에 따라 서비스 이용 제한을 요청받은 경우」(10호), 「회원이 타인의 가상자산 또는 원화를 법률상 원인 없이 취득하거나 전송받는 경우」(11호)",
      status: "verified",
      source: { label: "빗썸 이용약관 제14조 (2026-09-01 적용)", url: TERMS },
    },
    {
      label: "제한 통지",
      value:
        "「회사가 회원의 가상자산에 관한 입금 또는 출금을 차단하는 경우에는 그 사유를 미리 회원에게 통지합니다. 단, 긴급한 사유가 있는 경우에는 회원에 대한 입금 또는 출금의 차단 조치를 최소한으로 한 후에 통지할 수 있습니다.」 (이용약관 제14조 ③)",
      status: "verified",
      source: { label: "빗썸 이용약관 제14조 (2026-09-01 적용)", url: TERMS },
    },
    {
      label: "해제 조건",
      value: "「회사는 회원의 서비스 이용 제한 사유가 해소되는 경우 지체없이 서비스 이용 제한을 해지합니다.」 (이용약관 제13조 ⑤)",
      status: "verified",
      source: { label: "빗썸 이용약관 제13조 (2026-09-01 적용)", url: TERMS },
    },
    {
      label: "차단 기간",
      value:
        "「출금 제한 기간은 관련 법령에서 정한 범위 내에서 심사에 필요한 최소한의 기간으로 적용되며, 심사가 완료된 후 제한이 해제됩니다.」 최대 일수는 약관과 안내에 없습니다.",
      status: "verified",
      source: { label: "빗썸 고객지원 · FDS 출금 차단의 법적 근거가 무엇인가요?", url: FDS_LAW },
    },
    {
      label: "보이스피싱 지급정지",
      value:
        "빗썸라운지 방문 또는 fraudhelp@bithumbcorp.com 메일로 냅니다. 「지급정지 또는 전자금융거래 등의 제한이 이루어진 날부터 채권소멸절차 개시 공고일 이후 2개월이 경과하기 전까지 신청할 수 있습니다.」 필요 서류: 「이의제기 신청서」, 「신청인 신분증」, 「이의제기 입증할 수 있는 객관적인 자료」. 「이의제기 신청만으로 지급정지 등 조치가 즉시 해제되지 않습니다.」",
      status: "verified",
      source: { label: "빗썸 고객지원 · 지급정지 이의제기 신청", url: OBJECTION },
    },
    {
      label: "출처 불분명 입금",
      value: "「미신고 가상자산사업자 및 출처가 불분명한 지갑에서 빗썸으로 입금하시는 경우 입금이 제한됩니다.」 「자산반환은 FROM 주소로 반환을 원칙으로 하고 있습니다.」",
      status: "verified",
      source: { label: "빗썸 고객지원 · 가상자산 반환 신청 가이드", url: RETURN },
    },
  ],
  checkedAt: "2026-11-07",
};
