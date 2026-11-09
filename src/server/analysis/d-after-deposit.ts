// D. 입금 이후: 받은 뒤 지갑에서 무슨 일이 있었나
// 담당: 분석
//
// 이더리움은 받은 돈과 원래 잔액이 한 잔액으로 합쳐집니다.
// 그래서 "그 돈을 썼다/안 썼다"는 말할 수 없고, 시간 순서와 상대만 말합니다.
//   O  "입금 10분 뒤 본인 지갑이 다른 주소로 0.3 ETH를 보냈습니다" (누가 보냈는지 주어를 씁니다)
//   O  "입금 후 보낸 주소로 다시 보낸 기록은 확인되지 않았습니다"
//   X  "받은 돈을 쓰지 않았습니다"
//
// TODO(분석)
//   - 토큰 입금이면 같은 토큰의 이동만 따로 보여줄지 정하기
//   - 거래소 입금 주소로 바로 들어온 경우(거래소가 자금을 모아 옮김)는 문장을 다르게

import { amount, kst, short, txSource } from "@/server/format";
import type { PagedTransfers } from "@/server/providers/types";
import type { EvidenceItem, Transfer } from "@/types/case";

function minutesBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 60_000);
}

function afterLabel(minutes: number) {
  if (minutes < 60) return `${minutes}분 뒤`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}시간 뒤`;
  return `${Math.round(minutes / 1440)}일 뒤`;
}

export function analyzeAfterDeposit(walletOutgoing: PagedTransfers, transfer: Transfer, periodLabel: string) {
  const after = walletOutgoing.transfers
    .filter((item) => Date.parse(item.timestamp) > Date.parse(transfer.timestamp))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const returned = after.filter((item) => item.to.toLowerCase() === transfer.from.toLowerCase());
  const firstOutgoingAfter = after[0] ?? null;

  const evidence: EvidenceItem[] = [
    {
      id: "D-return",
      category: "verified",
      analysis: "D",
      title:
        returned.length === 0
          ? "입금 후 보낸 주소로 다시 보낸 기록은 확인되지 않았습니다"
          : `입금 후 보낸 주소로 다시 보낸 기록이 ${returned.length}건 있습니다`,
      description: `입금 후 ${periodLabel} 동안의 전송을 확인했습니다.`,
      sources: returned.length === 0 ? [txSource(transfer, "기준 입금")] : returned.map((item) => txSource(item, "다시 보낸 거래")),
    },
  ];

  if (firstOutgoingAfter) {
    const minutes = minutesBetween(transfer.timestamp, firstOutgoingAfter.timestamp);
    evidence.push({
      id: "D-first-outgoing",
      category: "verified",
      analysis: "D",
      title: `입금 ${afterLabel(minutes)} 본인 지갑이 다른 주소로 ${amount(firstOutgoingAfter)}를 보냈습니다`,
      description: `${kst(firstOutgoingAfter.timestamp)}, 받는 주소 ${short(firstOutgoingAfter.to, 8, 6)}. 시간 순서만 나타내며, 이번 입금액이 포함됐는지는 알 수 없습니다.`,
      sources: [txSource(firstOutgoingAfter, "입금 후 첫 전송")],
    });
  }

  return { returnedToSender: returned.length > 0, firstOutgoingAfter, evidence };
}
