// 화면은 이 파일을 통해서만 서버(/api)를 부릅니다.
// 요청·응답 모양은 docs/api.md와 src/types/case.ts를 따릅니다.

import type {
  CaseAnalysis,
  CaseReport,
  ExchangeDeposit,
  ExchangeSource,
  SubmissionDetails,
  Transfer,
  UserStatement,
} from "@/types/case";

export class ClientApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ClientApiError("NETWORK", "서버에 연결하지 못했습니다.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ClientApiError(error?.code ?? `HTTP_${response.status}`, error?.message ?? "요청을 처리하지 못했습니다.");
  }
  return data as T;
}

export async function getInboundTransfers(address: string) {
  return post<{ transfers: Transfer[]; complete: boolean; provider: string }>(
    "/api/wallets/inbound-transfers",
    { address },
  );
}

export async function lookupTransfers(txHash: string) {
  const data = await post<{ transfers: Transfer[] }>("/api/transfers/lookup", { txHash });
  return data.transfers;
}

// 화면은 키를 받지 않고 연결된 계정처럼 보여 줍니다. 키는 실제 거래소 연결을 붙일 때 넘깁니다.
export async function getExchangeDeposits(input: { exchange: ExchangeSource; apiKey?: string; apiSecret?: string }) {
  const data = await post<{ deposits: ExchangeDeposit[] }>("/api/exchanges/deposits", input);
  return data.deposits;
}

export async function analyzeCase(input: { walletAddress: string; transfer: Transfer }) {
  return post<CaseAnalysis>("/api/cases/analyze", {
    walletAddress: input.walletAddress,
    txHash: input.transfer.txHash,
    eventIndex: input.transfer.eventIndex,
  });
}

export async function createReport(input: {
  walletAddress: string;
  transfer: Transfer;
  statement: UserStatement;
  submission: SubmissionDetails;
}) {
  return post<{ analysis: CaseAnalysis; report: CaseReport }>("/api/cases/report", {
    walletAddress: input.walletAddress,
    txHash: input.transfer.txHash,
    eventIndex: input.transfer.eventIndex,
    statement: input.statement,
    submission: input.submission,
  });
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ClientApiError ? error.message : fallback;
