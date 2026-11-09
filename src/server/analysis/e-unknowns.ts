// E. 확인할 수 없는 것: 온체인으로 원래 알 수 없거나, 이번 조회 범위 밖인 것
// 담당: 분석
//
// 이 항목들은 "못 고친 버그"가 아니라 이 도구가 정직하게 보여줘야 하는 한계입니다.
// 사용자가 빼거나 고칠 수 없습니다.

import type { AnalysisScope, EvidenceItem } from "@/types/case";

export function listUnknowns(scope: AnalysisScope): EvidenceItem[] {
  const items: EvidenceItem[] = [
    {
      id: "E-intent",
      category: "unverifiable",
      analysis: "E",
      title: "본인의 실제 의도",
      description: "온체인 기록으로 확인할 수 없는 내용입니다. 본인 설명으로만 제시합니다.",
      sources: [],
    },
    {
      id: "E-offchain",
      category: "unverifiable",
      analysis: "E",
      title: "보낸 사람과의 온체인 밖 관계",
      description: "메신저, 대면 거래 등 블록체인 밖의 관계는 온체인 기록으로 확인할 수 없는 내용입니다.",
      sources: [],
    },
    {
      id: "E-fungibility",
      category: "unverifiable",
      analysis: "E",
      title: "받은 금액을 사용했는지 여부",
      description: "이더리움에서는 받은 금액이 기존 잔액과 합쳐져, 이후 전송에 이번 입금액이 포함됐는지 구분할 수 없습니다.",
      sources: [],
    },
  ];

  if (!scope.complete) {
    items.push({
      id: "E-scope",
      category: "unverifiable",
      analysis: "E",
      title: "조회 상한 밖의 기록",
      description: `조회 상한(${scope.maxTransfers.toLocaleString("en-US")}건)에 걸려 일부 기록만 확인했습니다. 상한 밖의 기록은 반영되지 않았습니다.`,
      sources: [],
    });
  }

  for (const failure of scope.failures) {
    items.push({
      id: `E-failure-${items.length}`,
      category: "unverifiable",
      analysis: "E",
      title: "조회에 실패한 범위",
      description: failure,
      sources: [],
    });
  }

  return items;
}
