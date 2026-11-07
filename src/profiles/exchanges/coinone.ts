import type { ExchangeProfile } from "@/types/case";

// 코인원 소명 절차
// 담당: 거래소 프로필 · 국내
// 출처는 코인원 기본약관(2026-10-01 시행), 개인정보 처리방침, 고객센터 안내입니다 (2026-11-07 확인).
// 약관에는 소명 절차와 7일 이의신청이 있지만, 일반 제한의 소명 창구와 심사 기간은 공개 문서에 없습니다.
// 「」 안은 원문 그대로입니다. 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.
// TODO(거래소 프로필 · 국내): 일반 이용 제한(자금세탁 의심 등)의 소명 제출 창구를 공개 문서에서 찾기

const TERMS = "https://coinone.co.kr/terms/basic";
const PRIVACY = "https://coinone.co.kr/terms/privacy";
const RETURN = "https://support.coinone.co.kr/support/solutions/articles/31000169481";
const OBJECTION_QA = "https://support.coinone.co.kr/support/solutions/articles/31000179777";

export const coinone: ExchangeProfile = {
  id: "coinone",
  name: "코인원",
  group: "kr",
  status: "verified",
  language: "ko",
  channel: "코인원 고객센터 [문의 남기기]", // 온라인 문의 창구. 일반 제한의 소명 전용 창구는 공개 문서에 없습니다
  reviewPeriod: null,
  // 개인정보 처리방침 "자금 출처 증빙 자료(… 금융거래확인서 등)", 이의제기 안내 "입금 경위, 거래 상대방, 거래 목적"
  requestedDocuments: ["depositReason", "bankRecords"],
  fields: [
    {
      label: "판단 방식",
      value:
        "「계정 정지시 회사는 계정에 대한 자체 조사를 실시하며, 회원은 회사의 조사에 적극적으로 협력해야 합니다.」 「계정에 대한 자체 조사 종료 후 회사는 재량에 따라 회원 계정 사용을 제한할 수 있고, 회사는 이 같은 결정에 대한 이유를 통지하며 이에 대한 소명 절차를 부여합니다.」 (기본약관 제18조 ⑤)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    {
      label: "제출 창구",
      value: "일반 이용 제한의 소명 창구는 공개 문서에서 찾지 못했습니다. 통지에서 확인하세요. 보이스피싱 지급정지와 입금 반환은 아래 접힌 칸에 있습니다.",
      status: "check",
    },
    {
      label: "요청 자료",
      value:
        "고객 신원 추가 확인 때 받는 항목: 「자금 출처 증빙 자료(근로소득원천징수영수증, 소득금액증명원, 금융거래확인서 등)」. 일반 이용 제한의 소명 자료 목록은 따로 없습니다.",
      status: "verified",
      source: { label: "코인원 개인정보 처리방침", url: PRIVACY },
    },
    {
      label: "이의신청",
      value:
        "「회원은 회사의 서비스 이용 제한에 대하여 통지일로부터 7일간 이의를 신청할 수 있습니다.」 「다만, 전기통신금융사기 피해 방지 및 피해자산 환급에 관한 특별법에 따른 조치의 통지, 이의제기, 기간 및 해제 등에 관하여는 같은 법 및 관련 법령에서 정하는 바에 따릅니다.」 (기본약관 제18조 ①)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    { label: "심사 기간", value: "일반 이용 제한의 소명 · 이의 심사 기간은 공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "제한 사유",
      value:
        "입금 · 출금 제한: 「자금세탁행위 등 범죄행위를 예방하기 위해 가상자산거래가 특정금융정보법 제2조제4호부터 제6호까지의 규정에 따른 불법재산, 자금세탁행위 및 공중협박자금조달행위와 관련이 있다고 의심할 만한 합리적 사유가 있는 경우」. 매매 · 출금 제한: 「대한민국의 정부기관 및 금융회사에서 회원의 계정이 자금세탁방지 의무를 위반하였거나 통신사기 등 범죄에 이용된 것으로 통지하는 경우」 (기본약관 제18조 ① 표)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    {
      label: "제한 통지",
      value:
        "「이 경우 회사는 그 사유, 일시 및 기간을 정하여 회원이 기재한 정보에 따른 전자우편, SMS 등의 방법으로 미리 통지하되」 긴급하면 제한과 동시에 통지할 수 있습니다. (기본약관 제18조 ①)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    {
      label: "해제 조건",
      value: "입금 · 출금 제한의 해제조건: 「정지사유 해결 또는 관리자 판단」 (기본약관 제18조 ① 표)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    {
      label: "차단 기간",
      value:
        "자금세탁 의심으로 막을 때: 「입금 또는 출금의 차단기간은 2개월의 범위에서 필요한 최소한의 기간으로 하되, 부득이한 사유가 있는 경우에는 두 차례에 한정하여 그 기간을 연장할 수 있음」 (기본약관 제18조 ① 표)",
      status: "verified",
      source: { label: "코인원 기본약관 제18조 (2026-10-01 시행)", url: TERMS },
    },
    {
      label: "보이스피싱 지급정지",
      value:
        "「이의제기 서류는 코인원 회원가입 시 등록한 이메일 주소로 fds@coinone.co.kr 로 발송해 주세요.」 「이의제기 처리기간은 제출된 자료, 사실관계 확인 및 관계기관 확인 여부 등에 따라 달라질 수 있습니다.」",
      status: "verified",
      source: { label: "코인원 고객센터 · 지급정지 이의제기 (명의인)", url: OBJECTION_QA },
    },
    {
      label: "출처 불분명 입금",
      value:
        "「미신고 가상자산 사업자 리스트 이외에도 출처가 불분명한 지갑에서 입금하시는 경우, 입금이 제한되어 '입금반영불가' 처리됩니다.」 「OFAC 포괄적 제재국가(북한, 이란, 시리아, 쿠바, 크림반도, 베네수엘라) 지갑 주소로부터 입금시 ‘입금반영불가’ 처리 됩니다.」 「반영불가 된 자산은 온라인 고객센터에서 문의 작성을 부탁드립니다.」",
      status: "verified",
      source: { label: "코인원 고객센터 · 미신고거래소 입/출금 제한 및 '입금 반영불가 자산' 반환 방법 안내", url: RETURN },
    },
  ],
  checkedAt: "2026-11-07",
};
