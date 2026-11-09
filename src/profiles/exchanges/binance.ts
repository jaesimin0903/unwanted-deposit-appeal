import type { ExchangeProfile } from "@/types/case";

// Binance 소명 절차
// 담당: 거래소 프로필 · 해외
// 출처는 Binance Support FAQ 공개 문서입니다 (2026-11-08 확인).
// 「」 안은 영어 원문 그대로입니다. 받아 둔 원문과 글자 단위로 대조했습니다.
// 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.
// 심사 기간, 제재 동결, 출처 불분명 입금은 공개 문서에서 찾지 못해 "check"로 남겼습니다.

const SOURCES = {
  withdrawal: {
    label: "Binance FAQ · How to Reactivate the Withdrawal Function for My Binance Account?",
    url: "https://www.binance.com/en/support/faq/360038583951",
  },
  sourceOfFunds: {
    label: "Binance FAQ · Guide to Verifying Source of Wealth and Source of Funds",
    url: "https://www.binance.com/en/support/faq/what-are-source-of-funds-and-source-of-wealth-6d7de22f918d4cf28d68a7079a10e254",
  },
  assetVideo: {
    label: "Binance FAQ · How to Prove the Source of My Assets",
    url: "https://www.binance.com/en/support/faq/how-to-prove-the-source-of-my-assets-7ee8ff5813c142248c6796897b654378",
  },
  complaint: {
    label: "Binance FAQ · How to raise a complaint?",
    url: "https://www.binance.com/en/support/faq/detail/fcda7991306f4d5f91bb2a1709d26b4c",
  },
  antiScam: {
    label: "Binance FAQ · Binance Withdrawal Anti-Scam Measures",
    url: "https://www.binance.com/en/support/faq/7f3b38cb6ffe431c899fad1d74d87eab",
  },
} as const;

const NOT_FOUND = "공개 자료에서 찾지 못했습니다.";

export const binance: ExchangeProfile = {
  id: "binance",
  name: "Binance",
  group: "intl",
  status: "verified",
  language: "en",
  channel: "Binance 고객센터 채팅 (본인 인증에 실패해 출금이 막혔으면 출금 화면 알림의 [Appeal] 버튼)",
  reviewPeriod: null,
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords"],
  fields: [
    {
      label: "판단 방식",
      value:
        // 원문의 큰따옴표를 그대로 옮기려고 작은따옴표 문자열을 씁니다
        '계정 보안과 관련 규정 준수를 위해 자금 출처(Source of Funds)와 재산 형성 경위(Source of Wealth)를 확인하며, 자금세탁방지(AML) · 테러자금조달방지(CTF) 규정을 지키기 위한 확인이라고 설명합니다. 「To keep your account secure and comply with applicable regulations, Binance needs to understand your "Money Story."」 「Binance is committed to complying with all applicable Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) regulations and best practices.」',
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "제출 창구",
      value:
        "Binance가 계정에 건 출금 · 거래 제한을 묻거나 이의를 제기하려면 고객센터(Customer Service)에 직접 연락합니다. 「In case further inquiries are needed regarding these restrictions, or you wish to appeal against such suspensions, please contact Customer Service directly.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "요청 자료",
      value:
        "자금 출처는 Binance 계정에 입금하는 법정화폐나 가상자산이 어디서 왔는지, 재산 형성 경위는 평생에 걸쳐 순자산을 어떻게 쌓았는지를 말합니다. 사업 소득, 근로 소득, 투자 소득, 대출, 상속 · 증여, 연금 · 가족 지원, 도박 · 복권, 기타로 나눠 출처마다 받는 서류를 표로 안내합니다. 「This refers to the origin of the specific fiat money or crypto funds you are depositing into your Binance account.」 「This describes how you built your total net worth over your lifetime.」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "가상자산 자료",
      value:
        "가상자산 투자로 생긴 자금이면 가상자산 계정 명세서(UID와 인증된 이메일, 잔액이나 자산 가치가 보이는 것), 지갑 화면(보유 자산, 잔액, 지갑 주소가 보이는 것), 매도 대금이 들어온 은행 거래내역 등을 받습니다. 지갑 화면은 함께 낸 거래소 명세서, 블록체인 기록, 세금 서류와 맞아야 합니다. 「Display your Unique Account ID (UID) and verified email address.」 「Be consistent with any exchange statements, blockchain records, or tax documents provided.」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "자산 출처 영상",
      value:
        "입금한 자산의 출처를 보이려면 Binance 계정의 입금 기록과, 자금을 출금한 외부 플랫폼에 로그인해 출금 기록 · TxID를 찾는 과정을 담은 영상을 고객센터에 냅니다. 화면 녹화가 아니라 직접 촬영하고, 플랫폼 이름과 주소, 코인 이름, 수량, TxID가 보이게 하되 비밀번호는 가리고 영상 하나에 담습니다. 「To proof the source of your assets deposited, you need to submit a video to our Customer Service team to show the related transaction records.」 「You have to record the process live instead of a screen record;」 「Please include the content in a single video.」",
      status: "verified",
      source: SOURCES.assetVideo,
    },
    {
      label: "서류 조건",
      value:
        "서류는 계정 이름과 같은 이름으로, 300 DPI 해상도에 네 모서리가 보이게 내고 자르거나 흐리게 하거나 필터를 쓰지 않습니다. 수정할 수 없는 PDF, JPG, PNG만 받고(엑셀 · 워드는 대체로 거절, 원본 PDF 권장) 스크린숏은 URL과 이름, 날짜가 보이는 전체 화면일 때만 받으며, 최근 문서(예: 최근 3개월 급여명세서, 최근 연도 세금 신고)를 냅니다. 「Documents must match the name on your account.」 「High resolution (300 DPI) is required.」 「Only non-editable formats (PDF, JPG, PNG) are acceptable.」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "이의신청",
      value:
        "제한에 대한 이의는 고객센터로 내지만, 모든 계정 제한이 이의 대상은 아니며 수사기관 명령이나 규제 의무에 따른 제한이 특히 그렇습니다. 이의 기한은 공개 자료에서 찾지 못했습니다. 「However, please note that not all account restrictions are open for appeal.」 「This is particularly true in instances involving law enforcement orders or regulatory obligations.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "본인 인증 실패 이의",
      value:
        "출금이 일시 중지된 뒤 본인 인증을 통과하지 못했다면 웹은 Withdraw Crypto 화면 알림의 [Withdraw appeal], 앱은 [Wallets] → [Spot] → [Withdraw] 팝업의 [Appeal]을 눌러 필요한 서류를 냅니다. [Appeal] 버튼이 없으면 Binance Support에 연락합니다. 「If you cannot pass the verification, go to the Withdraw Crypto page and click [Withdraw appeal] on the alert, then submit the required documents.」 「If you cannot see the [Appeal] button, please contact Binance Support for assistance.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "민원",
      value:
        "서비스나 결과에 불만이 있으면 Support Center나 24시간 채팅으로 공식 민원을 낼 수 있고, 2영업일 안에 접수 확인을 보내며 30영업일(어떤 경우든 60영업일) 안에 최종 답변을 주려고 합니다. Binance 민원 절차를 다 거친 뒤에는 아부다비 금융감독청(ADGM FSRA)에 제기할 수 있으며, FSRA는 2026년 1월 5일 이후 일어난 일만 다룹니다. 「If you are dissatisfied with a service or outcome, you may file an official complaint through our Support Center or 24/7 live chat.」 「We aim to provide a final response within 30 business days.」 「In all cases, we will endeavour to provide a final response within 60 business days, depending on the nature and complexity of the matter.」 「If you have fully used Binance’s complaint channels and remain dissatisfied with the outcome, you may escalate your complaint to our financial regulator, the Financial Services Regulatory Authority (FSRA) of the Abu Dhabi Global Markets (ADGM).」",
      status: "verified",
      source: SOURCES.complaint,
    },
    { label: "심사 기간", value: NOT_FOUND, status: "check" },
    {
      label: "제한 사유",
      value:
        "시스템이 계정에서 비정상 활동을 감지하면 출금 기능을 일시 중지하고, 계정 보안과 플랫폼 무결성을 위해 때로 특정 계정의 출금이나 거래 기능을 미리 제한합니다. 입금 출처와 관련된 제한 사유는 공개 자료에서 따로 찾지 못했습니다. 「The withdrawal function will also be temporarily disabled if the system detects abnormal activities in your account.」 「To secure users’ accounts and maintain platform integrity, Binance occasionally enforces restrictions on specific accounts.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "제한 통지",
      value:
        "계정을 제한하면 보통은 이메일, SMS, 앱 알림으로 바로 알리고, 다음 로그인 때 팝업으로 거래 · 출금 중지 이유를 자세히 보여 줍니다. 「Therefore, under normal circumstances, when restrictions are implemented on an account, Binance will promptly inform the affected users via email, SMS, or in-app notifications.」 「Furthermore, affected users will also see a pop-up message on their next login attempt.」 「They can view more details on the reasons behind the trading and/or withdrawal suspensions.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "해제 조건",
      value:
        "출금이 일시 중지됐을 때 웹이나 앱에서 본인 인증을 마치면 팀이 심사하고, 승인되면 출금 기능이 곧 다시 열립니다. 「After completing the identity verification, please wait patiently for the team to review your application.」 「Once approved, your account’s withdrawal function will be resumed shortly.」",
      status: "verified",
      source: SOURCES.withdrawal,
    },
    {
      label: "사기 방지 제한 해제",
      value:
        "사기 방지 조치로 출금이 막혔지만 사기가 아니라면 거래 정보를 갖고 Binance Support에 연락하며, 제한은 24시간 안에 또는 확인을 거친 뒤 풀립니다. 「Contact Binance Support with your transaction details.」 「The restriction will be lifted within 24 hours or after verification.」",
      status: "verified",
      source: SOURCES.antiScam,
    },
    {
      label: "차단 기간",
      value:
        "사기 방지 조치로 막는 출금 제한(cool-down)은 일시적이며 최대 24시간까지라고 안내합니다. 계정 심사로 건 제한의 최대 기간은 공개 자료에서 찾지 못했습니다. 「The restrictions are temporary and can only last up to a maximum of 24 hours.」 「Cool-down periods typically last up to 24 hours and are never permanent.」",
      status: "verified",
      source: SOURCES.antiScam,
    },
    { label: "제재 동결", value: NOT_FOUND, status: "check" },
    { label: "출처 불분명 입금", value: NOT_FOUND, status: "check" },
    {
      label: "사칭 주의",
      value:
        "미리 잡은 약속이나 본인이 연 상담 티켓 없이 Binance라며 전화가 오면 사기라고 안내합니다. Binance 고객지원 직원을 사칭해 돈을 보내게 하거나 계정 정보를 받아 내려는 사기범은 KYC 완료나 계정 제한 해제를 핑계로 행동을 재촉하기도 합니다. 「If someone calls you claiming to be from Binance without a prior scheduled appointment or an active support ticket you've opened, it is a scam.」 「Some scammers impersonate Binance Support staff to trick you into sending money or sharing their account details.」 「Their tactics may include urging you to take action under the pretext of completing KYC, resolving account restrictions, or accessing exclusive offers.」",
      status: "caution",
      source: SOURCES.antiScam,
    },
  ],
  checkedAt: "2026-11-08",
};
