import "server-only";

// 조사 전체 흐름: 데이터 가져오기 → A~E 분석 → 증거 목록·그래프 만들기
// 각 분석 함수는 데이터를 직접 가져오지 않습니다(순수 함수). 그래서 고정 데이터로 바로 테스트할 수 있습니다.

import { analyzeAfterDeposit } from "@/server/analysis/d-after-deposit";
import { analyzePriorRelation } from "@/server/analysis/b-prior-relation";
import { analyzeSprayPattern } from "@/server/analysis/c-spray-pattern";
import { describeTransaction } from "@/server/analysis/a-transaction";
import { listUnknowns } from "@/server/analysis/e-unknowns";
import { ANALYSIS_VERSION, EXPLORER_BASE, SCOPE } from "@/server/constants";
import { addressSource, amount, short } from "@/server/format";
import type { OnchainProvider } from "@/server/providers/types";
import { checkSanctions } from "@/server/sanctions";
import type { AnalysisScope, CaseAnalysis, EvidenceItem, GraphEdge, GraphNode, Transfer } from "@/types/case";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export async function runCaseAnalysis(input: {
  provider: OnchainProvider;
  walletAddress: string;
  transfer: Transfer;
}): Promise<CaseAnalysis> {
  const { provider, walletAddress, transfer } = input;
  const depositTime = Date.parse(transfer.timestamp);
  const fetchedAt = new Date().toISOString();

  // 기간은 "입금 시각" 기준 (지금 기준 아님)
  const sprayWindow = {
    start: new Date(depositTime - SCOPE.windowHours * HOUR).toISOString(),
    end: new Date(depositTime + SCOPE.windowHours * HOUR).toISOString(),
  };
  const afterWindow = {
    start: transfer.timestamp,
    end: new Date(depositTime + SCOPE.afterDepositDays * DAY).toISOString(),
  };

  const [between, senderOutgoing, walletOutgoing] = await Promise.all([
    provider.getTransfersBetween(walletAddress, transfer.from, transfer.timestamp, SCOPE.maxTransfers),
    provider.getOutgoingTransfers(transfer.from, sprayWindow, SCOPE.maxTransfers),
    provider.getOutgoingTransfers(walletAddress, afterWindow, SCOPE.maxTransfers),
  ]);

  const windowLabel = `입금 전후 ${SCOPE.windowHours}시간`;
  const scope: AnalysisScope = {
    windowLabel,
    windowStart: sprayWindow.start,
    windowEnd: sprayWindow.end,
    maxTransfers: SCOPE.maxTransfers,
    fetchedTransfers: senderOutgoing.transfers.length,
    complete: between.complete && senderOutgoing.complete && walletOutgoing.complete,
    provider: provider.name,
    fetchedAt,
    failures: [...between.failures, ...senderOutgoing.failures, ...walletOutgoing.failures],
  };

  const a = describeTransaction(transfer);
  const b = analyzePriorRelation(between, transfer);
  const c = analyzeSprayPattern(senderOutgoing, transfer, windowLabel);
  const d = analyzeAfterDeposit(walletOutgoing, transfer, `${SCOPE.afterDepositDays}일`);
  const sanctions = checkSanctions(transfer.from, fetchedAt);

  const sanctionsEvidence: EvidenceItem = {
    id: "S-sanctions",
    category: "verified",
    analysis: "S",
    title: sanctions.senderMatched
      ? "보낸 주소가 조회한 제재 목록과 일치합니다"
      : "보낸 주소는 조회한 제재 목록에서 일치하지 않습니다",
    // 일치하면 "제재 목록에 있는 것은 보낸 주소"라는 점을, 일치하지 않으면 "목록 밖이라고 안전하다는 뜻은 아니다"를 덧붙입니다
    description: sanctions.senderMatched
      ? `${sanctions.listName}(${sanctions.listUpdatedAt} 기준)과 직접 비교했습니다. 목록과 일치한 것은 보낸 주소이며, 본인 지갑 주소는 비교 대상이 아닙니다.`
      : `${sanctions.listName}(${sanctions.listUpdatedAt} 기준)과 직접 비교했습니다. 목록에 없다는 것이 안전한 주소라는 뜻은 아닙니다.`,
    sources: [addressSource(transfer.from, "보낸 주소", EXPLORER_BASE)],
  };

  const evidence = [a, sanctionsEvidence, b.evidence, c.evidence, ...d.evidence, ...listUnknowns(scope)];

  return {
    caseId: `CASE-${transfer.txHash.slice(2, 8).toUpperCase()}`,
    version: ANALYSIS_VERSION,
    walletAddress,
    transfer,
    scope,
    facts: {
      priorDirectTransactions: b.count,
      senderRecipientCount: c.recipientCount,
      similarAmountCount: c.similarCount,
      returnedToSender: d.returnedToSender,
      firstOutgoingAfter: d.firstOutgoingAfter,
    },
    sanctions,
    evidence,
    ...buildGraph(walletAddress, transfer, c.sampleRecipients),
  };
}

function buildGraph(walletAddress: string, transfer: Transfer, samples: Transfer[]) {
  const nodes: GraphNode[] = [
    { id: "sender", label: "보낸 주소", detail: short(transfer.from), role: "sender", x: 90, y: 150 },
    { id: "subject", label: "내 지갑", detail: short(walletAddress), role: "subject", x: 330, y: 150 },
  ];
  const edges: GraphEdge[] = [
    { id: "sender-subject", from: "sender", to: "subject", label: amount(transfer), emphasized: true },
  ];

  const rows = [54, 150, 246];
  samples.forEach((sample, index) => {
    const id = `r${index + 1}`;
    nodes.push({ id, label: "다른 받은 주소", detail: short(sample.to), role: "recipient", x: 570, y: rows[index] });
    edges.push({ id: `sender-${id}`, from: "sender", to: id, label: amount(sample) });
  });

  return { nodes, edges };
}
