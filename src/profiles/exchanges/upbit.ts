import type { ExchangeProfile } from "@/types/case";

// 업비트 소명 절차
// 담당: 거래소 프로필 · 국내
// 출처는 업비트 이용약관(2026-10-01 적용), 개인정보처리방침 V2.57(2026-10-06 적용),
// 서비스 및 계정 운영 정책(2026-09-09 적용), 고객센터 안내입니다 (2026-11-07 확인).
// 「」 안은 원문 그대로입니다. 원문은 리더(r.jina.ai)로 받아 글자 단위로 대조했습니다.
// 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.

const TERMS = "https://www.upbit.com/terms_of_service";
const PRIVACY = "https://www.upbit.com/privacy_policy";
const POLICY = "https://support.upbit.com/hc/ko/articles/5124045638553";
const RETURN = "https://support.upbit.com/hc/ko/articles/4758752982169";

export const upbit: ExchangeProfile = {
  id: "upbit",
  name: "업비트",
  group: "kr",
  status: "verified",
  language: "ko",
  channel: "업비트 홈페이지 · 앱의 고객센터 > 1:1 문의",
  reviewPeriod: null,
  // 개인정보처리방침 "자금출처확인" 수집 항목: 입금TXID, 입금사유, 금융기관 거래내역, 타 가상자산거래소 거래내역
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords"],
  fields: [
    {
      label: "판단 방식",
      value: "「회사는 이용제한 사유 해당 여부를 판단하기 위하여 회원에게 자금 출처에 대한 소명을 요청할 수 있습니다.」 (이용약관 제17조 ⑧)",
      status: "verified",
      source: { label: "업비트 이용약관 제17조 (2026-10-01 적용)", url: TERMS },
    },
    {
      label: "제출 창구",
      value: "「이용 제한에 대해 이의가 있는 회원은 업비트 홈페이지나 앱의 고객센터 > 1:1 문의를 통하여 이의신청 및 소명을 할 수 있습니다.」 (운영 정책 제4조 ②)",
      status: "verified",
      source: { label: "업비트 서비스 및 계정 운영 정책 제4조", url: POLICY },
    },
    {
      label: "요청 자료",
      value:
        "자금출처확인 때 받는 항목: 「입금일시, 입금한 디지털자산 종류, 입금TXID, 자산의 출처, 입금사유, 입금된 디지털 자산에 대한 거래계획, 금융기관 거래내역, 타 가상자산거래소 거래내역, 증여나 양도 또는 상속 등을 입증할 수 있는 서류」",
      status: "verified",
      source: { label: "업비트 개인정보처리방침 V2.57 · 자금출처확인", url: PRIVACY },
    },
    {
      label: "이의신청",
      value: "「회원은 본조에 따른 이용제한 등에 대해 고객센터를 통하여 이의신청을 할 수 있습니다.」 (이용약관 제17조 ⑦) 이의신청 기한은 약관에 없습니다.",
      status: "verified",
      source: { label: "업비트 이용약관 제17조 (2026-10-01 적용)", url: TERMS },
    },
    { label: "심사 기간", value: "소명 · 이의신청의 심사 기간은 공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "제한 사유",
      value:
        "「회원이 발급받은 디지털 자산 입금주소로 특정금융정보법상 트래블룰(travel rule)을 준수하지 않은 디지털 자산이 입금된 경우」(제17조 ① 18호), 「회원 또는 회원의 계정이 시세조종, 자금세탁, 불공정거래, 범죄행위 등에 관여하고 있거나 관여하고 있다고 합리적으로 의심되는 경우」(10호), 「수사기관이 매매 및/또는 입출금 제한을 요청하는 경우」(4호)",
      status: "verified",
      source: { label: "업비트 이용약관 제17조 (2026-10-01 적용)", url: TERMS },
    },
    {
      label: "제한 통지",
      value:
        "「원칙적으로 구체적인 입출금 차단 사유 등을 회원에게 사전에 개별 통지합니다.」 다만 「사전통지가 불가능한 경우(전산장애 발생, 가상자산이용자보호법 시행령 제12조에 따른 사고 발생, 고객확인정보 제공 거부 등)에는 차단과 동시에 개별통지 또는 일괄통지할 수 있습니다.」 (이용약관 제19조 ⑦)",
      status: "verified",
      source: { label: "업비트 이용약관 제19조 (2026-10-01 적용)", url: TERMS },
    },
    {
      label: "해제 조건",
      value:
        "「객관적인 자료에 의하여 이의사유가 정당함이 명백히 확인되거나 객관적인 자료가 없더라도 이의사유가 타당한 경우 회사는 즉시 서비스의 이용 재개 등 필요한 조치를 합니다.」 (이용약관 제17조 ⑦)",
      status: "verified",
      source: { label: "업비트 이용약관 제17조 (2026-10-01 적용)", url: TERMS },
    },
    {
      label: "차단 기간",
      value:
        "자금세탁 등 범죄 의심으로 막을 때: 「입금 또는 출금의 차단기간은 2개월의 범위에서 필요한 최소한의 기간으로 하되, 부득이한 사유가 있는 경우에는 두 차례에 한정하여 그 기간을 연장할 수 있음」 (이용약관 제17조 ② 6호)",
      status: "verified",
      source: { label: "업비트 이용약관 제17조 (2026-10-01 적용)", url: TERMS },
    },
    {
      label: "보이스피싱 지급정지",
      value:
        "「전기통신금융사기 등의 금융사고 신고가 접수된 계정의 경우, 출금 및 매매가 제한되며」 해제를 요청하면 「업비트는 회원에게 소명 자료 제출을 요구할 수 있습니다.」 「사고 이력이 등록된 회원은 등록 후 90 일간 원화 입출금 서비스를 이용할 수 없습니다.」 (운영 정책 제3조)",
      status: "verified",
      source: { label: "업비트 서비스 및 계정 운영 정책 제3조", url: POLICY },
    },
    {
      label: "출처 불분명 입금",
      value:
        "「트래블룰 미준수 혹은 출처가 불분명한 입금 건은 회원님 계정으로 입금 반영되지 않습니다.」 「1:1 문의하기로 입금 반환을 신청해 주시기 바랍니다.」 「처리 완료까지는 수일이 소요될 수 있습니다.」",
      status: "verified",
      source: { label: "업비트 입금 반환 절차 안내", url: RETURN },
    },
  ],
  checkedAt: "2026-11-07",
};
