import type { ExchangeProfile } from "@/types/case";

// Coinbase 소명 절차
// 담당: 거래소 프로필 · 해외
// 출처는 Coinbase Help 공개 문서입니다 (2026-11-08 확인).
// help.coinbase.com은 자동 요청을 막아서, 원문은 리더(r.jina.ai)로 받고
// 리더가 막힌 계정 제한 안내(account-restriction)는 브라우저(Chrome)로 열어 받았습니다.
// 「」 안은 영어 원문 그대로이고, 받은 원문과 글자 단위로 대조했습니다. 「」 앞은 우리가 옮긴 설명입니다.
// 칸 순서는 src/profiles/README.md "칸 순서"를 따릅니다. 해외 거래소라 10번째 칸은 "제재 동결"입니다.
// 이의신청, 차단 기간, 제출 기한은 공개 문서에서 찾지 못해 "check"로 남겼습니다.
// 예전 자금 출처 서류 안내(.../managing-my-account/other/proof-of-source-of-funds-and-wealth-documents)는
// 2026-11-08 기준 "Page not found"입니다. 서류 조건은 계정 검토 안내에 있는 내용만 씁니다.

const SOURCES = {
  accountReview: {
    label: "Coinbase Help · Provide information for an account review",
    url: "https://help.coinbase.com/en/coinbase/managing-my-account/other/account-review",
  },
  ofac: {
    label: "Coinbase Help · OFAC blocking FAQ",
    url: "https://help.coinbase.com/en/coinbase/other-topics/legal-policies/ofac",
  },
  restriction: {
    label: "Coinbase Help · Resolve your account restriction",
    url: "https://help.coinbase.com/en/coinbase/privacy-and-security/other/account-restriction",
  },
  dusting: {
    label: "Coinbase Help · Dusting attacks",
    url: "https://help.coinbase.com/en/coinbase/privacy-and-security/avoid-scams/dusting-attacks",
  },
  scams: {
    label: "Coinbase Help · Technical support and impersonation scams",
    url: "https://help.coinbase.com/en/coinbase/privacy-and-security/avoid-scams/tech-support-scams",
  },
} as const;

export const coinbase: ExchangeProfile = {
  id: "coinbase",
  name: "Coinbase",
  group: "intl",
  status: "verified",
  language: "en",
  channel: "Coinbase 계정의 알림 또는 계정 작업(account task) 화면",
  reviewPeriod:
    "정보 요청 검토는 정해진 기간 없음 · 서류와 계정 활동에 따라 다름. 계정 제한 해제 검토는 보통 최대 10영업일 (제출 기한이 아니라 심사 기간)",
  // 계정 검토 안내에 나온 자료: "Blockchain transaction IDs", "Bank or brokerage statement", "Statements from another exchange"
  requestedDocuments: ["txHash", "depositReason", "bankRecords", "otherExchangeRecords"],
  fields: [
    {
      label: "판단 방식",
      value:
        "계정 활동이나 프로필, 지역 규제, 갱신 · 확인이 필요한 정보, 정기 검토 때문에 추가 정보를 요청할 수 있고, 요청 내용은 국가 · 지역, 계정을 맡은 Coinbase 법인, 쓰는 상품, 계정 활동에 따라 다릅니다. 정보 요청이 잘못을 했다는 뜻은 아니라고 적혀 있습니다. 「Requirements depend on your country or region, the Coinbase entity servicing your account, the products you use, and your account activity.」 「A request for information doesn't mean you've done anything wrong.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "제출 창구",
      value:
        "Coinbase 계정에 로그인해 알림이나 계정 작업(account task)을 열고, 질문에 답한 뒤 요청받은 경우 선명하고 유효한 문서를 올려 제출합니다. 문서는 Coinbase 앱이나 공식 Coinbase 웹사이트로만 내라고 안내합니다. 「Open the notification or account task to submit the requested information.」 「Only submit documents through the Coinbase app or an official Coinbase website.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "요청 자료",
      value:
        "상황에 따라 직업 · 사업 · 고용, 예상 계정 활동과 거래량, 계정 목적, 자금 출처, 재산 형성 경위, 사업체 등과의 관계, 거래의 보낸 사람 · 받는 사람, 거주지 주소 · 거주 증명, 납세자 식별 정보, 가상자산 거래 내역을 요청하고, 서류는 은행 · 증권 명세서, 급여명세서, 매매 · 대출 계약서, 상속 · 증여 서류처럼 확인할 정보에 맞는 것을 받습니다. 실제로 낼 것은 내 Coinbase 계정에 표시된 요청이 가장 정확하다고 적혀 있습니다. 「The documents accepted depend on the information Coinbase needs to verify.」 「The information requested in your Coinbase account is the most accurate guide for your review.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "가상자산 자료",
      value:
        "자금이 가상자산 활동에서 왔다면 자산을 어떻게 얻고 옮겼는지 보여 주는 자료(다른 거래소 명세서, 거래 내역, 지갑 거래 내역, 블록체인 거래 ID, 외부 지갑 · 거래소 계정이 본인 것임을 보여 주는 자료 등)를 냅니다. 개인 지갑은 주소, 거래 내역, 날짜, 자산, 금액이 보이는 기록을 냅니다. 「If your funds came from crypto activity, provide documents that show how you obtained and transferred the assets.」 「For self-custody wallets, provide records that show the wallet address, transaction history, dates, assets, and amounts.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "서류 조건",
      value:
        "서류는 선명하고 읽을 수 있어야 하고, 검토의 날짜 요건을 맞추며, 본인 이름 등 본인 것임을 알 수 있는 정보가 보여야 합니다. 서류가 거절되면 계정에 표시된 이유를 보고 요건에 맞는 다른 서류를 냅니다. 「Documents should be clear and readable and meet the date requirements for your review.」 「They should show your name or another detail that identifies them as yours.」 「If Coinbase rejects a document, review the reason shown in your account and submit an alternative document that meets the requirements.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    { label: "이의신청", value: "공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "심사 기간",
      value:
        "정해진 기간은 적혀 있지 않고, 요청한 정보, 서류의 품질과 완전성, 계정 활동의 복잡도, 추가 정보나 수동 검토가 필요한지에 따라 달라집니다. 빠짐없고 선명하고 일관된 정보를 내면 지연을 줄일 수 있다고 안내합니다. 「Submitting complete, clear, and consistent information can help avoid delays.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    { label: "제출 기한", value: "공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "제한 사유",
      value:
        "'Sorry, account temporarily disabled' 메시지는 보통 보안 문제 때문에 나오고, 의심되는 악성 활동, 계정 복구 중 문제, 본인 요청 등으로 계정이 일시 정지되거나 제한될 수 있습니다. 「A 'Sorry, account temporarily disabled' error message typically displays within your account due to a potential security issue.」",
      status: "verified",
      source: SOURCES.restriction,
    },
    {
      label: "자료를 내지 않으면",
      value:
        "요청한 정보를 받아 확인할 때까지 일부 거래나 계정 기능이 늦어지거나 제한될 수 있습니다. 끝내 내지 않으면 검토를 끝내지 못해 거래 지연, 입금 · 출금 · 거래 제한, 일부 기능의 일시 제한, 추가 정보 요청, 계정 종료가 될 수 있습니다. 「Certain transactions or account functions may be delayed, limited, or unavailable until Coinbase receives and verifies the requested information.」 「If you do not provide the requested information, Coinbase may be unable to complete the review.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "제한 통지",
      value:
        "추가 정보가 필요하면 이메일이나 Coinbase 계정으로 알림을 보내고, 거래가 영향을 받으면 가능한 경우 계정에 그 상태나 필요한 조치를 보여 줍니다. 「If Coinbase needs additional information, you'll receive a notification by email or through your Coinbase account.」 「If a transaction is affected, Coinbase will show the relevant status or required action in your account where available.」",
      status: "verified",
      source: SOURCES.accountReview,
    },
    {
      label: "해제 조건",
      value:
        "제한이 자동으로 풀리기를 기다리거나 계정 복구 절차를 따를 수 있습니다. 절차를 마치려면 2단계 인증 수단에 접근해 로그인할 수 있어야 하고, 보안 권장 사항을 반영한 뒤 Coinbase.com에 로그인해 제한된 동작을 다시 해 봅니다. 「You can wait for the restriction to be auto removed or follow the steps below for account recovery.」 「You must be able to access your 2-step verification method and sign in to your account to complete this process.」",
      status: "verified",
      source: SOURCES.restriction,
    },
    {
      label: "제한 해제 검토 기간",
      value:
        "해제 처리와 답변 검토는 보통 최대 10영업일 걸리고, 더 걸리는 경우도 있습니다. 검토가 끝나면 이메일로 알립니다. 「Restriction resolution and response review processing typically takes up to 10 business days.」 「Some individual cases may take longer.」 「We will email you upon review completion.」",
      status: "verified",
      source: SOURCES.restriction,
    },
    { label: "차단 기간", value: "공개 자료에서 찾지 못했습니다.", status: "check" },
    {
      label: "제재 동결",
      value:
        "제재 주소와 주고받으려 한 거래를 Coinbase가 알렸다면 그 자금은 동결되어 Coinbase 내부 보관 계정으로 옮겨지고, 동결된 거래는 취소할 수 없습니다. 계정의 다른 자금은 이 제한을 받지 않고 이용약관에 따라 쓸 수 있습니다. 「If we notify you about an attempt to send or receive from a sanctioned address, the funds have been blocked and will be moved to a secure Coinbase internal holding account.」 「Blocked payments can't be canceled.」 「Other funds in your account are not subject to this restriction and are available for your use, subject to the terms of the Coinbase User Agreement.」",
      status: "verified",
      source: SOURCES.ofac,
    },
    {
      label: "동결 해제 절차",
      value:
        "자금을 돌려받으려면 OFAC 웹사이트의 Release of Blocked Funds 신청서로 OFAC 특정 허가(specific license)를 받아야 하고, 거래를 이어 가지 않으려는 경우에도 허가가 필요합니다. Coinbase는 OFAC 허가를 받기 전에는 이 자금에 조치할 수 없습니다. 「To get your funds back, apply for a specific license from OFAC using the Release of Blocked Funds license application on OFAC's website.」 「A license is required to release the blocked funds, even if you do not want to proceed with the transaction.」 「Coinbase can't take action on these funds until receiving a license from OFAC.」",
      status: "verified",
      source: SOURCES.ofac,
    },
    {
      label: "허가서 제출",
      value:
        "OFAC 허가를 받으면 Coinbase Support에 연락하고, 지원 담당자가 보내는 보안 링크로 허가서와 거래 정보를 냅니다. 메신저나 이메일로는 보내지 않고, 제출하고 24~48시간 안에 자금이 보여야 한다고 안내합니다. 「A Coinbase support agent will provide you with a secure link to provide the license and transaction details.」 「Don't send these documents through messenger or email.」 「You should see your funds within 24-48 hours after submitting your license to us.」",
      status: "verified",
      source: SOURCES.ofac,
    },
    {
      label: "출처 불분명 입금",
      value:
        "OFAC 제재 주소에서 요청하지 않은 가상자산이 오면 Coinbase가 그 시도를 알리고 계정에 입금되지 않게 자동으로 막으며, 따로 할 일은 없고 자금은 모두 쓸 수 있다고 안내합니다. 「If this activity occurs, Coinbase will alert you about the attempted transaction.」 「Coinbase automatically stops funds, sent from a sanctioned address, from being deposited into your account.」 「No action is needed, and you should have full access to your funds.」 제재 주소가 아닌 곳에서 온 소액이 아닌 입금의 처리와, 막힌 입금의 반환 절차는 공개 자료에서 찾지 못했습니다.",
      status: "verified",
      source: SOURCES.ofac,
    },
    {
      label: "요청하지 않은 소액 입금",
      value:
        "먼지 공격(dusting attack)은 아주 적은 양의 가상자산을 에어드롭으로 여러 지갑에 보낸 뒤, 받은 사람이 그 자금을 옮기면 그 움직임으로 지갑 주인을 알아내려는 공격이라고 설명합니다. 예상하지 못한 소액이 오면 그냥 두면 되고, 그러면 공격자가 주소 주인을 알아내는 데 필요한 분석을 할 수 없다고 안내합니다. 「A dusting attack begins when an attacker sends “dust” funds (a tiny amount of crypto) to multiple wallets via an airdrop.」 「If you receive unexpected dust funds from an airdrop, you can simply leave them alone, in which case the attacker can’t perform the required analysis to try to de-anonymize the address.」",
      status: "verified",
      source: SOURCES.dusting,
    },
    {
      label: "주의",
      value:
        "정보를 낸다고 해서 거래나 계정 기능이 승인된다는 보장은 없고, 제출한 정보가 정확하고 빠짐없고 최신인지는 제출한 사람이 책임진다고 적혀 있습니다. 「Providing information does not guarantee that a transaction or account feature will be approved.」 「You're responsible for ensuring that all information submitted is accurate, complete, and up to date.」",
      status: "caution",
      source: SOURCES.accountReview,
    },
    {
      label: "사칭 주의",
      value:
        "Coinbase 직원은 비밀번호나 2단계 인증 코드를 묻거나, 자산을 특정 주소 · 새 주소로 옮기라고 하거나, 외부 주소로 가상자산을 보내라고 하지 않습니다. 이런 요청을 받으면 통화를 끊고 security@coinbase.com에 바로 알리라고 안내합니다. 「Remember, no one will ever ask for your password, 2FA codes, or for you to transfer assets to a specific or new address, account, vault, or wallet.」 「Coinbase staff will never ask you to send cryptocurrency to external addresses.」 「If you’re asked for any of the above, disconnect the call and email security@coinbase.com immediately.」",
      status: "caution",
      source: SOURCES.scams,
    },
    {
      label: "검토 중 고객지원",
      value:
        "정책 위반, 분쟁, 손실을 일으킨 활동으로 검토 중인 계정은 고객지원 대기열이나 이용할 수 있는 창구가 바뀔 수 있다고 적혀 있습니다. 「Coinbase may modify support access, including queue routing and channel availability, for accounts under review for policy violations, disputes, or loss-generating activity.」",
      status: "caution",
      source: SOURCES.restriction,
    },
  ],
  checkedAt: "2026-11-08",
};
