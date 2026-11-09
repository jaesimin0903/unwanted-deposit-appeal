import type { ExchangeProfile } from "@/types/case";

// Kraken 소명 절차
// 담당: 거래소 프로필 · 해외
// 출처는 Kraken Support Center 공개 문서입니다 (2026-11-08 확인).
// 「」 안은 영어 원문 그대로입니다. 원문은 리더로 받아 글자 단위로 대조했습니다.
// 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다.
// 제재 동결과 출처 불분명 입금에 관한 안내는 공개 문서에서 찾지 못해 "check"로 남겼습니다.

const SOURCES = {
  restricted: {
    label: "Kraken Support · Why is my account restricted?",
    url: "https://support.kraken.com/articles/why-is-my-account-restricted",
  },
  request: {
    label: "Kraken Support · Responding to a request for additional information",
    url: "https://support.kraken.com/articles/responding-to-request-for-additional-information",
  },
  sourceOfFunds: {
    label: "Kraken Support · Why do we ask for Source of Wealth or Source of Funds Documents?",
    url: "https://support.kraken.com/articles/source-of-wealth-or-source-of-funds-documents",
  },
  protective: {
    label: "Kraken Support · Why does my account have temporary protective measures?",
    url: "https://support.kraken.com/articles/why-does-my-account-have-temporary-protective-measures",
  },
  closure: {
    label: "Kraken Support · Account Closures: Safeguarding Our Clients and Kraken",
    url: "https://support.kraken.com/articles/account-closures-safeguarding-our-clients-and-kraken",
  },
} as const;

const NOT_FOUND = "공개 자료에서 찾지 못했습니다.";

export const kraken: ExchangeProfile = {
  id: "kraken",
  name: "Kraken",
  group: "intl",
  status: "verified",
  language: "en",
  channel: "Kraken 웹사이트의 추가 정보 요청 화면 (웹 브라우저에서만 답할 수 있음)",
  reviewPeriod: "보통 제한일부터 10~14영업일 (제출 기한이 아니라 심사 기간)",
  requestedDocuments: ["depositReason", "bankRecords", "otherExchangeRecords", "exchangeRecords"],
  fields: [
    {
      label: "판단 방식",
      value:
        "계정 보안과 법적 · 규제 의무를 위해 계정 정보 확인이나 문서를 요청할 수 있다고 안내합니다. 계정 사용 방식이 바뀌거나 거래 규모 · 종류 때문에 확인이 더 필요할 때도 요청합니다. 「From time to time we may ask you to confirm some details or provide documents relating to your account. This is a normal part of keeping Kraken secure and meeting our legal and regulatory obligations.」 「Certain activity may mean we need more information to complete our checks, for example a change in how you use your account, or the size or type of a transaction.」",
      status: "verified",
      source: SOURCES.request,
    },
    {
      label: "제출 창구",
      value:
        "추가 정보 요청은 현재 웹 브라우저로 kraken.com에 로그인해야 보고 답할 수 있고, Kraken 앱에는 나오지 않습니다. 요청의 항목마다 답하거나 문서를 올려 항목별로 제출합니다. 「You can currently only view and respond to this request using a web browser.」 「The request will not appear in the Kraken app.」 「Submit each item once you have completed it.」",
      status: "verified",
      source: SOURCES.request,
    },
    {
      label: "제출 기한",
      value:
        "요청마다 완료 기한이 적혀 있고 그 전에 알림을 보냅니다. 답 없이 기한이 지나면 거래 · 입금 같은 일부 활동을 멈출 수 있지만 출금은 영향이 없고, 자료 준비가 늦어지면 기한 전에 연락하라고 안내합니다. 「Your request shows the date it needs to be completed by, and we will send you a reminder beforehand.」 「If a request expires without a response, we may need to pause some activity on your account, such as trading and deposits, until the information is provided. Withdrawals are not affected.」 「If the date is approaching and you are having difficulty, for example your bank is slow to produce a statement, contact us before the request expires and we will work with you.」",
      status: "verified",
      source: SOURCES.request,
    },
    {
      label: "요청 자료",
      value:
        "흔히 요청하는 자료는 자금 출처 증빙, 재산 형성 경위 증빙, 은행 명세서, 주소 증빙, 이미 등록된 정보 확인이고, 무엇을 요청할지는 사정과 거주국에 따라 다릅니다. 「What we ask for depends on your circumstances and where you live. Common requests include proof of source of funds, proof of source of wealth, bank statements, proof of address, or confirmation of details we already hold.」",
      status: "verified",
      source: SOURCES.request,
    },
    {
      label: "자금 출처 서류",
      value:
        "재산 형성 경위(Source of Wealth)와 특정 거래의 자금 출처(Source of Funds) 서류를 요청할 수 있습니다. 자금이 이미 Kraken 계정에 있으면, 그 자금이나 가상자산이 Kraken 계정으로 들어왔음을 보여 주는 문서도 냅니다. 「Proof of Source of Funds (POSOF) verifies where your money comes from for a specific transaction.」 「If funds are already in your Kraken account, also provide a document showing that the funds/crypto were transferred into your Kraken account (e.g., bank statement or crypto wallet transaction).」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "가상자산 자료",
      value:
        "외부 가상자산거래소 명세서(이름, 이메일 ID, 지갑 주소, 잔액이 보이는 것)와, 그 가상자산을 사는 데 쓴 자산의 원래 출처를 보여 주는 문서를 받습니다. 「External cryptoasset exchange statement, showing your name, email ID, wallet address and balance(s), along with a document identifying the original source of the assets used to purchase the cryptoassets」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "서류 조건",
      value:
        "파일 형식은 .pdf .png .jpg .jpeg .doc .docx이고, 24개월 안의 날짜가 있어야 하며(예외 있음), 주소는 Kraken 프로필의 주소와 같아야 하고 사서함(P.O. Box) 주소는 받지 않습니다. 계좌번호 같은 민감한 정보는 가려도 되지만 이름, 발행처 이름 · 로고, 명세서 · 거래 날짜, 잔액, 거래 금액은 보여야 하고, 잔액이 0인 명세서는 받지 않습니다. 「Documents must be dated within 24 months (but exceptions apply).」 「Address in the document must match the one listed in your Kraken profile and P.O. Box addresses are not acceptable.」 「Sensitive data (e.g., account numbers, SSN) may be redacted, but the essential information must remain visible.」 「Dollar amount of account balance cannot be $0.」",
      status: "verified",
      source: SOURCES.sourceOfFunds,
    },
    {
      label: "이의신청",
      value:
        "계정 종료 결정은 대체로 최종이지만, 잘못 종료됐다고 보면 지원팀이 두 번째 검토로 올릴 수 있고 결정이 바뀌면 이메일로 알립니다. 이의 기한은 이 문서에 없습니다. 「Account closure decisions are generally final. However, if you believe your account was closed in error, our support team can escalate your case for a second review. If the decision changes, you will be notified by email.」",
      status: "verified",
      source: SOURCES.closure,
    },
    {
      label: "심사 기간",
      value:
        "보통 제한일부터 10~14영업일 걸리고 바쁠 때는 더 걸릴 수 있으며, 14영업일이 지나도 연락이 없으면 채팅 지원으로 문의합니다. 제출 기한이 아니라 심사 기간입니다. 「It usually takes 10–14 business days from the date of the restriction, and can take longer when we’re busy.」 「If you haven’t heard from us and it’s been more than 14 business days, reach out to us on chat support.」",
      status: "verified",
      source: SOURCES.restricted,
    },
    {
      label: "제출 후 상태",
      value:
        "보낸 항목은 Submitted로, 검토가 끝나면 Reviewed로 바뀝니다. 문서가 불분명하거나 요청한 기간을 다 담지 않으면 Needs update와 사유가 표시되고 이메일이 오며, 모두 검토되면 검토 완료를 이메일로 알립니다. 「Items you have sent will show as Submitted, and will change to Reviewed once our team has looked at them.」 「If we need something else, for example, if a document was unclear or did not cover the period we asked for, the item will show as Needs update along with the reason, and we will email you.」 「Once everything has been reviewed and no further information is needed, we will email you to confirm the review is complete.」",
      status: "verified",
      source: SOURCES.request,
    },
    {
      label: "심사 중",
      value:
        "입출금이 멈춘 경우, 계정 심사를 마칠 때까지 법정화폐와 가상자산의 입출금을 처리하지 않습니다. 「We can’t process fiat or crypto deposits or withdrawals until we finish reviewing your account.」",
      status: "verified",
      source: SOURCES.restricted,
    },
    {
      label: "제한 사유",
      value:
        "정확한 제한 사유를 늘 알려 줄 수는 없다고 하며, 흔한 사유로 법적 · 규제상 필요한 검토, 금지된 활동과 연결된 지갑으로 자금을 보내는 것 같은 약관 위반 활동, 요청한 정보를 받지 못한 경우 등을 듭니다. 「Legal and regulatory requirements. For example, a review we’re required to complete, or a change in whether we can serve your country.」 「Activity that doesn’t meet our terms. For example, sending funds to a wallet linked to prohibited activity.」 「Your ID or contact details are missing, expired, or couldn’t be confirmed, or we asked for more information and haven’t received it.」",
      status: "verified",
      source: SOURCES.restricted,
    },
    {
      label: "제한 통지",
      value:
        "추가 정보가 필요하면 이메일과 앱 알림으로 알립니다. Kraken이 보낸 이메일(스팸함 포함)과 앱 · 웹사이트 알림에서 요청을 찾으라고 안내합니다. 「If we need more information, we’ll email you and send a notification in the app.」 「Look for an email from Kraken (check your spam folder too) and for notifications in the app or on the website.」",
      status: "verified",
      source: SOURCES.restricted,
    },
    {
      label: "해제 조건",
      value:
        "대부분의 제한은 심사가 끝나면 풀리고, 입출금 같은 일부 기능은 심사가 끝날 때까지 쓸 수 없을 수 있습니다. 「Some features, such as deposits or withdrawals, may be unavailable until the review is complete. Most restrictions are lifted once we finish a review, which usually takes 10–14 business days.」",
      status: "verified",
      source: SOURCES.restricted,
    },
    {
      label: "차단 기간",
      value:
        "사기 패턴과 맞는 활동으로 건 임시 보호 조치(temporary protective measures)에는 최소 유지 기간(최대 90일)이 있고, 기간은 계정 활동의 위험 요인에 따라 달라질 수 있으며 고객지원도 그 전에는 풀 수 없습니다. 일반 계정 제한의 최대 기간은 공개 자료에서 찾지 못했습니다. 「These protections stay in place for a minimum period of up to 90 days as part of our client safety policy. The duration of restriction may vary depending on various risk factors associated with your account activity.」 「Our support team is available via chat support to answer questions about what you can still do while your account has protective measures, but they can’t lift them earlier than the stated minimum period, as this protects you from further potential harm.」",
      status: "verified",
      source: SOURCES.protective,
    },
    {
      label: "임시 보호 조치",
      value:
        "최근 거래 활동이 사기 패턴이나 계정을 위험하게 할 수 있는 지갑과의 노출에 맞으면 자금 한도(funding limits)를 임시로 줄일 수 있습니다. 가상자산 출금을 막는 경우 대기 중인 가상자산 출금은 취소되고 자산은 잔액에 남습니다. 「If your recent transaction activity matches patterns associated with scams or exposure to wallets that could put your account at risk, we may apply temporary funding limits as a protective measure」 「Crypto withdrawals are temporarily disabled and any pending crypto withdrawals are canceled. The assets remain in your account balance.」",
      status: "verified",
      source: SOURCES.protective,
    },
    {
      label: "보호 조치 검토 요청",
      value:
        "최소 기간이 지나면 채팅으로 계정 검토를 요청할 수 있고, 결과는 이메일로 알립니다. 보호 조치가 잘못 적용됐다고 보면 언제든 채팅 지원으로 문의할 수 있습니다. 「Once the minimum period has passed, you can ask our team to review your account.」 「We’ll email you with the outcome of your review. If you believe these protections were applied in error, you can contact our Support team through chat support at any time.」",
      status: "verified",
      source: SOURCES.protective,
    },
    { label: "제재 동결", value: NOT_FOUND, status: "check" },
    { label: "출처 불분명 입금", value: NOT_FOUND, status: "check" },
    {
      label: "주의",
      value:
        "Kraken은 비밀번호, 2FA 코드, 복구 문구(recovery phrase)를 묻지 않고 다른 주소로 자금을 옮기라고 하지 않는다고 안내합니다. 연락받은 요청이 로그인한 계정에 보이지 않으면 그 메시지를 의심하라고 합니다. 「Kraken will never ask you for your password, 2FA codes, or recovery phrase, and will never ask you to move funds to another address.」 「A genuine request will always be visible on your account after you log in. If you were contacted about a request but see nothing on your account, treat the message as suspicious.」",
      status: "caution",
      source: SOURCES.request,
    },
  ],
  checkedAt: "2026-11-08",
};
