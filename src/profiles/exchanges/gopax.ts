import type { ExchangeProfile } from "@/types/case";

// 고팍스 소명 절차
// 담당: 거래소 프로필 · 국내
// 출처는 고팍스 이용약관(2026-09-08 시행), 개인정보 처리방침(2026-08-04 적용), 도움말센터 공개 문서입니다 (2026-11-07 확인).
// 도움말센터(cs.gopax.co.kr) 본문은 streami.atlassian.net에 있습니다. 원문은 리더(r.jina.ai)로 받아 대조했습니다.
// 「」 안은 원문 그대로입니다. 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.

const TERMS = "https://www.gopax.co.kr/terms";
const PRIVACY = "https://www.gopax.co.kr/policy";
const HELP = "https://streami.atlassian.net/wiki/spaces/GHC/pages";

export const gopax: ExchangeProfile = {
  id: "gopax",
  name: "고팍스",
  group: "kr",
  status: "verified",
  language: "ko",
  channel: "고팍스 이메일 상담 help@gopax.co.kr", // 가입한 이메일 계정으로 보냅니다 (제출 창구 칸)
  reviewPeriod: null,
  // 개인정보 처리방침 "출금 심사: [자금세탁방지 증빙자료 필요시] 전북은행 계좌의 최근 3개월 입출금 거래내역"
  requestedDocuments: ["bankRecords"],
  fields: [
    {
      label: "판단 방식",
      value: "「다만 이 경우 회사는 회원에게 소명기회를 제공하고 회원이 합리적인 소명을 하는 경우에는 제한을 즉시 해제하여야 합니다.」 (이용약관 제19조 ①)",
      status: "verified",
      source: { label: "고팍스 이용약관 제19조 (2026-09-08 시행)", url: TERMS },
    },
    {
      label: "제출 창구",
      value: "「고팍스로부터 출금과 관련한 서류 증빙을 안내 받으신 경우」 「고팍스에 가입하신 이메일 계정으로 help@gopax.co.kr 에 문의해 주시기 바랍니다.」",
      status: "verified",
      source: { label: "고팍스 도움말센터 · 12. 출금심사", url: `${HELP}/1061847096` },
    },
    {
      label: "요청 자료",
      value: "출금 심사에서 받는 항목: 「[자금세탁방지 증빙자료 필요시] 전북은행 계좌의 최근 3개월 입출금 거래내역」. 그 밖의 소명 자료 목록은 찾지 못했습니다.",
      status: "verified",
      source: { label: "고팍스 개인정보 처리방침 (2026-08-04 적용)", url: PRIVACY },
    },
    {
      label: "이의신청",
      value: "「서비스 이용중지를 통지받은 회원 또는 그 대리인은 이용중지에 대하여 이의가 있을 경우 이의 신청을 할 수 있습니다.」 (이용약관 제8조 ④) 이의신청 기한은 약관에 없습니다.",
      status: "verified",
      source: { label: "고팍스 이용약관 제8조 (2026-09-08 시행)", url: TERMS },
    },
    { label: "심사 기간", value: "소명 · 이의의 회신 기한은 공개 자료에서 찾지 못했습니다. 처리 시간은 접힌 칸에 있습니다.", status: "check" },
    {
      label: "제한 사유",
      value:
        "「시세조종, 자금세탁, 불공정거래, 범죄행위 등에 관여하고 있거나 관여하고 있다고 합리적으로 의심되는 경우」(제19조 ① 6호), 「국가기관이 관련 법령에 따라 서비스 제한을 요청하는 경우」(5호). 특정금융정보법 「위반과 관련이 있는 것으로 의심할 만한 합리적 사유가 있는 경우에는 입금 또는 출금을 차단할 수 있습니다.」(제19조 ② 14호)",
      status: "verified",
      source: { label: "고팍스 이용약관 제19조 (2026-09-08 시행)", url: TERMS },
    },
    {
      label: "제한 통지",
      value:
        "「회사는 이용제한을 하고자 하는 경우에는 그 사유, 일시 및 기간을 정하여 서면 또는 전화, 홈페이지의 메시지 기능 등의 방법을 이용하여 해당 회원 또는 대리인에게 통지합니다.」 (이용약관 제8조 ③)",
      status: "verified",
      source: { label: "고팍스 이용약관 제8조 (2026-09-08 시행)", url: TERMS },
    },
    {
      label: "해제 조건",
      value: "「회사는 이용중지 기간 중에 그 이용중지 사유가 해소된 것이 객관적으로 확인된 경우에 한하여 이용중지 조치를 즉시 해제합니다.」 (이용약관 제8조 ⑤)",
      status: "verified",
      source: { label: "고팍스 이용약관 제8조 (2026-09-08 시행)", url: TERMS },
    },
    {
      label: "차단 기간",
      value: "특정금융정보법 위반 의심으로 막을 때: 「이 경우 차단기간은 2개월의 범위에서 정할 수 있으며, 부득이한 사유가 있는 경우에는 두 차례 연장할 수 있습니다.」 (이용약관 제19조 ② 14호)",
      status: "verified",
      source: { label: "고팍스 이용약관 제19조 (2026-09-08 시행)", url: TERMS },
    },
    {
      label: "보이스피싱 지급정지",
      value:
        "우편 · 팩스 · 이메일(usersupport@streami.co)로 냅니다. 「지급정지 등이 이루어진 날부터 채권소멸절차 개시 공고일을 기준으로 2개월이 지나기 전 까지 신청할 수 있습니다.」 필요 서류에 「이의제기 사유를 증명할 수 있는 객관적인 자료」가 들어갑니다. 「자료가 충분하지 않거나 정상적인 거래였다는 사실을 객관적으로 확인하기 어려운 경우 이의제기가 받아들여지지 않을 수 있습니다.」",
      status: "verified",
      source: { label: "고팍스 도움말센터 · 지급정지에 이의제기하고 싶어요", url: `${HELP}/2336096269` },
    },
    {
      label: "출처 불분명 입금",
      value: "「동의 거부 시 트래블룰의 적용을 받지 않고 GOPAX로 송금한 가상자산의 입금 반영이 불가할 수 있습니다.」 「반환 시 네트워크 전송 수수료는 차감됩니다.」",
      status: "verified",
      source: { label: "고팍스 도움말센터 · 입금 반영 중(미반영) 증빙 자료", url: `${HELP}/1061093518` },
    },
    {
      label: "처리 시간",
      value: "「심사가 필요한 입출금 건은 평일 09:00~18:00 운영시간 중 확인 후 처리됩니다.」",
      status: "verified",
      source: { label: "고팍스 도움말센터 · 12. 출금심사", url: `${HELP}/1061847096` },
    },
  ],
  checkedAt: "2026-11-07",
};
