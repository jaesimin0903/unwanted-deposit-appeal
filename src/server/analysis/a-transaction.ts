// A. 거래 자체: 언제, 누가, 얼마를 보냈나
// 담당: 분석

import { amount, kst, short, txSource } from "@/server/format";
import type { EvidenceItem, Transfer } from "@/types/case";

export function describeTransaction(transfer: Transfer): EvidenceItem {
  return {
    id: "A-transfer",
    category: "verified",
    analysis: "A",
    title: `본인 지갑이 ${amount(transfer)}를 받았습니다`,
    description: `${kst(transfer.timestamp)}, 블록 ${transfer.blockNumber.toLocaleString("en-US")}에서 ${short(transfer.from, 8, 6)} 주소가 보낸 입금입니다.`,
    sources: [txSource(transfer)],
  };
}
