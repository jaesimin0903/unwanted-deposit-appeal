// C. 뿌리기 패턴: 보낸 사람이 같은 시기에 여러 주소에 비슷한 금액을 보냈나
// 담당: 분석
//
// 비슷한 금액 = 같은 자산이고, 금액 차이가 기준 금액의 ±10% 이내 (SCOPE.similarAmountRatio)
// 비교는 displayValue가 아니라 rawValue(정수)로 합니다.
//
// TODO(분석)
//   - 기준(±10%, 24시간)이 적절한지 실제 사례로 확인하고 근거를 docs에 남기기
//   - 조회가 잘렸으면(complete=false) "최대 N건 중 조회한 범위에서"라고 분모를 밝히기
//   - 테스트: 같은 주소에 여러 번 보낸 경우, 다른 토큰이 섞인 경우, 금액 0인 경우

import { EXPLORER_BASE, SCOPE } from "@/server/constants";
import { addressSource, amount } from "@/server/format";
import type { PagedTransfers } from "@/server/providers/types";
import type { EvidenceItem, Transfer } from "@/types/case";

const sameAsset = (a: Transfer, b: Transfer) =>
  a.assetType === b.assetType && (a.contractAddress ?? "") === (b.contractAddress ?? "");

export function isSimilarAmount(base: Transfer, other: Transfer, ratio = SCOPE.similarAmountRatio) {
  if (!sameAsset(base, other)) return false;
  const baseValue = BigInt(base.rawValue);
  const otherValue = BigInt(other.rawValue);
  if (baseValue === BigInt(0)) return otherValue === BigInt(0);
  const diff = baseValue > otherValue ? baseValue - otherValue : otherValue - baseValue;
  const scale = BigInt(1000);
  return diff * scale <= baseValue * BigInt(Math.round(ratio * 1000));
}

export function analyzeSprayPattern(senderOutgoing: PagedTransfers, transfer: Transfer, windowLabel: string) {
  const recipients = new Set<string>();
  const similarRecipients = new Set<string>();

  for (const item of senderOutgoing.transfers) {
    const to = item.to.toLowerCase();
    recipients.add(to);
    if (isSimilarAmount(transfer, item)) similarRecipients.add(to);
  }

  const total = senderOutgoing.transfers.length;
  const scopeNote = senderOutgoing.complete ? `${total}건 전부` : `최대 ${total}건까지만`;

  const evidence: EvidenceItem = {
    id: "C-spray",
    category: "derived",
    analysis: "C",
    title: `보낸 주소는 ${windowLabel} 동안 상대 지갑 ${recipients.size}곳 중 ${similarRecipients.size}곳에 비슷한 금액을 보냈습니다`,
    description: `같은 기간 보낸 전송 ${scopeNote} 확인했습니다. 상대 지갑 ${recipients.size}곳 중 ${similarRecipients.size}곳이 받은 금액이 ${amount(transfer)}의 ±${Math.round(SCOPE.similarAmountRatio * 100)}% 범위입니다.`,
    sources: [addressSource(transfer.from, "보낸 주소의 전송 기록", EXPLORER_BASE)],
  };

  const sampleRecipients = senderOutgoing.transfers
    .filter((item) => item.to.toLowerCase() !== transfer.to.toLowerCase() && isSimilarAmount(transfer, item))
    .slice(0, 3);

  return {
    recipientCount: recipients.size,
    similarCount: similarRecipients.size,
    sampleRecipients,
    evidence,
  };
}
