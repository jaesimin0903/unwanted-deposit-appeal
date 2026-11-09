import type { Answer, DataProvider, EvidenceCategory } from "@/types/case";

export function shortAddress(value: string, left = 6, right = 4) {
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export function formatKoreanDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function formatKoreanDateTime(value: string) {
  return `${new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value))} KST`;
}

// 노션과 같은 용어를 씁니다
export const categoryLabels: Record<EvidenceCategory, string> = {
  verified: "확인된 기록",
  derived: "기록 비교 결과",
  unverifiable: "확인할 수 없음",
};

export const providerLabels: Record<DataProvider, string> = {
  demo: "데모 고정 데이터",
  alchemy: "Alchemy",
  upbit: "업비트",
  binance: "바이낸스",
};

export function answerLabel(value: Answer) {
  if (value === "no") return "아니요";
  if (value === "yes") return "예";
  if (value === "unknown") return "모름";
  return "미확인";
}

// 기한까지 남은 날 (한국 날짜 기준). 날짜가 없으면 빈 문자열
export function daysLeftLabel(date: string | null, today: string): string {
  if (!date) return "";
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days > 0) return `${days}일 남음`;
  if (days === 0) return "오늘까지";
  return `${-days}일 지남`;
}
