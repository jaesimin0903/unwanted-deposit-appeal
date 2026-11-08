import type { ExchangeId } from "@/types/case";

// 거래소 로고: 각 거래소 공식 사이트가 쓰는 아이콘(파비콘 · 앱 아이콘)을 96px PNG로 줄인 것입니다 (public/logos/, 2026-11-08 받음).
// Coinbase와 Binance는 사이트가 자동 요청을 막아서 Google 파비콘 서비스로 같은 아이콘을 받았습니다.
// "그 외"처럼 특정 거래소가 아닌 칸은 로고가 없습니다.
const LOGOS: Partial<Record<ExchangeId, string>> = {
  upbit: "/logos/upbit.png",
  bithumb: "/logos/bithumb.png",
  coinone: "/logos/coinone.png",
  korbit: "/logos/korbit.png",
  gopax: "/logos/gopax.png",
  kraken: "/logos/kraken.png",
  coinbase: "/logos/coinbase.png",
  binance: "/logos/binance.png",
};

export function ExchangeLogo({ id, size, className }: { id: ExchangeId; size: number; className?: string }) {
  const src = LOGOS[id];
  if (!src) return null;
  // 거래소 이름이 바로 옆에 있으므로 로고는 읽지 않게 둡니다
  return <img className={["exchange-logo", className].filter(Boolean).join(" ")} src={src} alt="" width={size} height={size} />;
}
