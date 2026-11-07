// 거래소 안내문에서 입력값을 "제안"만 합니다. 결정은 사용자가 하며, 화면에서 적용 여부를 직접 고르게 합니다.
// 글에 분명히 적힌 것만 읽고, 애매하면 비워 둡니다.

import type { ProfiledExchangeId, RestrictionScope, RestrictionType } from "@/types/case";

export interface NoticeHints {
  restrictionType?: Exclude<RestrictionType, "unknown">;
  scope?: Exclude<RestrictionScope, "unknown">;
  exchange?: Exclude<ProfiledExchangeId, "kr-other" | "intl-other">;
  deadline?: string; // YYYY-MM-DD, "…까지" 제출하라고 적힌 날
  asksSourceOfFunds: boolean;
  found: string[]; // 화면에 보여 줄 짧은 라벨
}

type Exchange = NonNullable<NoticeHints["exchange"]>;

const EXCHANGES: { id: Exchange; label: string; pattern: RegExp }[] = [
  { id: "upbit", label: "업비트", pattern: /업비트|upbit/i },
  { id: "bithumb", label: "빗썸", pattern: /빗썸|bithumb/i },
  { id: "coinone", label: "코인원", pattern: /코인원|coinone/i },
  { id: "korbit", label: "코빗", pattern: /코빗|korbit|디지털엑스/i },
  { id: "gopax", label: "고팍스", pattern: /고팍스|gopax/i },
  { id: "kraken", label: "Kraken", pattern: /kraken|크라켄/i },
  { id: "coinbase", label: "Coinbase", pattern: /coinbase|코인베이스/i },
  { id: "binance", label: "Binance", pattern: /binance|바이낸스/i },
];

const SCOPE_LABELS = {
  deposit: "문제 입금만 반영 안 됨",
  withdraw: "출금 제한",
  account: "계정 전체 제한",
} as const;

const TYPE_LABELS = {
  internal: "거래소 내부 심사로 보임",
  sanction: "제재에 따른 자산 동결로 보임",
  phishing: "보이스피싱 법정 지급정지로 보임",
} as const;

const PHISHING = /지급\s*정지|통신\s*사기|전기\s*통신\s*금융\s*사기|피해\s*구제|채권\s*소멸/;
const SANCTION = /제재|OFAC|동결/i;
const INTERNAL = /이상\s*거래|소명|자금\s*출처|FDS|출금\s*제한|입출금\s*제한|이용\s*제한/i;

// 문장 경계(. 줄바꿈) 안에서 가까이 붙은 말만 인정합니다.
const ACCOUNT = /계정[^.\n출입]{0,8}?(?:정지|제한|잠금)/;
const WITHDRAW = /출금[^.\n]{0,12}?(?:제한|정지|보류|차단)/;
const DEPOSIT = /입금[^.\n]{0,12}?(?:보류|반영|제한|반환)/;

const SOURCE_OF_FUNDS = /자금\s*출처|자금의\s*출처|출처\s*소명/;

// [연도.]월.일 + (몇 글자) + 까지
const DEADLINE = /(?:(\d{4})\s*[년.\-/]\s*)?(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?[^\n]{0,8}?까지/g;

const pad = (n: number) => String(n).padStart(2, "0");

function isRealDate(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function findDeadline(text: string, today: string): string | undefined {
  const todayYear = Number(today.slice(0, 4));
  for (const match of text.matchAll(DEADLINE)) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    let year = match[1] ? Number(match[1]) : todayYear;
    if (!isRealDate(year, month, day)) continue;
    let iso = `${year}-${pad(month)}-${pad(day)}`;
    // 연도가 없고 이미 지난 날이면 다음 해로 봅니다.
    if (!match[1] && iso < today) {
      year += 1;
      if (!isRealDate(year, month, day)) continue;
      iso = `${year}-${pad(month)}-${pad(day)}`;
    }
    return iso;
  }
  return undefined;
}

export function parseNotice(text: string, today: string): NoticeHints {
  const hints: NoticeHints = { asksSourceOfFunds: false, found: [] };
  if (!text.trim()) return hints;

  // 가장 먼저 나오는 거래소 이름을 씁니다.
  let exchangeLabel = "";
  let firstAt = Infinity;
  for (const item of EXCHANGES) {
    const at = text.search(item.pattern);
    if (at !== -1 && at < firstAt) {
      firstAt = at;
      hints.exchange = item.id;
      exchangeLabel = item.label;
    }
  }

  if (ACCOUNT.test(text)) hints.scope = "account";
  else if (WITHDRAW.test(text)) hints.scope = "withdraw";
  else if (DEPOSIT.test(text)) hints.scope = "deposit";

  hints.deadline = findDeadline(text, today);
  hints.asksSourceOfFunds = SOURCE_OF_FUNDS.test(text);

  if (PHISHING.test(text)) hints.restrictionType = "phishing";
  else if (SANCTION.test(text)) hints.restrictionType = "sanction";
  else if (INTERNAL.test(text)) hints.restrictionType = "internal";

  if (hints.exchange) hints.found.push(exchangeLabel);
  if (hints.scope) hints.found.push(SCOPE_LABELS[hints.scope]);
  if (hints.deadline) hints.found.push(`기한 ${hints.deadline}`);
  if (hints.restrictionType) hints.found.push(TYPE_LABELS[hints.restrictionType]);

  // 못 찾은 칸은 키 자체를 두지 않습니다.
  for (const key of ["exchange", "scope", "deadline", "restrictionType"] as const) {
    if (hints[key] === undefined) delete hints[key];
  }
  return hints;
}
