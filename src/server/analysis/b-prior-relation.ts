// B. 이전 관계: 입금 전에 두 주소가 직접 거래한 적이 있나
// 담당: 분석
//
// TODO(분석)
//   - 조회가 잘렸을 때(complete=false) 문장을 "조회한 N건 안에서는"으로 바꾸기
//   - 이전 거래가 있으면 그 거래들도 sources에 넣기 (불리한 사실도 숨기지 않기)

import { EXPLORER_BASE } from "@/server/constants";
import { addressSource, txSource } from "@/server/format";
import type { PagedTransfers } from "@/server/providers/types";
import type { EvidenceItem, Transfer } from "@/types/case";

export function analyzePriorRelation(between: PagedTransfers, transfer: Transfer) {
  const count = between.transfers.length;
  const evidence: EvidenceItem = {
    id: "B-prior",
    category: "verified",
    analysis: "B",
    title:
      count === 0
        ? "입금 전 두 주소 사이의 직접 거래는 확인되지 않았습니다"
        : `입금 전 두 주소 사이의 직접 거래가 ${count}건 있습니다`,
    description:
      count === 0
        ? "조회한 기록에서 본인 지갑과 보낸 주소가 서로 직접 주고받은 전송은 0건입니다."
        : "아래 거래는 이번 입금보다 먼저 두 주소 사이에서 오간 전송입니다.",
    sources:
      count === 0
        ? [addressSource(transfer.from, "보낸 주소 기록", EXPLORER_BASE)]
        : between.transfers.map((item) => txSource(item, "이전 거래")),
  };

  return { count, evidence };
}
