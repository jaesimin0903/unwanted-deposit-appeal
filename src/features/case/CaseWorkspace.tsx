"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeCase,
  createReport,
  errorMessage,
  getExchangeDeposits,
  getInboundTransfers,
  lookupTransfers,
} from "@/lib/api/cases";
import { readWalletAddress } from "@/lib/wallet";
import { exchangeLabel } from "@/profiles";
import {
  acceptedType,
  attachmentMeta,
  documentsWithFiles,
  type PreparedFile,
  type SlotId,
} from "@/features/case/attachments";
import type { AttachmentState } from "@/features/case/AttachmentBoard";
import { AnalysisScreen } from "@/features/case/screens/AnalysisScreen";
import { ReportScreen } from "@/features/case/screens/ReportScreen";
import { SituationScreen } from "@/features/case/screens/SituationScreen";
import { StatementScreen, type StatementPart } from "@/features/case/screens/StatementScreen";
import { TransactionScreen, type IntakeSource } from "@/features/case/screens/TransactionScreen";
import type {
  CaseAnalysis,
  CaseReport,
  CaseStep,
  ExchangeDeposit,
  ExchangeSource,
  SubmissionDetails,
  Transfer,
  UserStatement,
} from "@/types/case";

const steps: Array<{ id: CaseStep; label: string }> = [
  { id: "situation", label: "상황" },
  { id: "transaction", label: "입금 찾기" },
  { id: "analysis", label: "기록 확인" },
  { id: "statement", label: "내 설명" },
  { id: "report", label: "소명서" },
];

const initialSubmission: SubmissionDetails = {
  exchange: "unspecified",
  restrictionType: "unknown",
  scope: "unknown",
  noticeDate: "",
  baseDate: "",
  requestText: "",
  requestType: "account",
  objectionGround: "notUsed",
  availableDocuments: [],
};

// 모든 답은 "선택 안 함"으로 시작합니다. 도구가 답을 대신 고르지 않기 위해서입니다.
const initialStatement: UserStatement = {
  requestedTransfer: null,
  knowsSender: null,
  hadPurpose: null,
  discoveredAt: "",
  note: "",
  attachments: [],
};

// 데모 모드 고정 데이터의 지갑 주소 (src/fixtures/demo-case.ts)
export const EXAMPLE_WALLET = "0x1111111111111111111111111111111111111111";

const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

// 입금 목록을 API로 불러올 수 있는 거래소 (src/server/exchanges/). 1단계에서 고른 거래소가 이 중 하나일 때만 씁니다.
const DEPOSIT_SOURCES: ExchangeSource[] = ["upbit", "binance"];
const depositSourceOf = (exchange: SubmissionDetails["exchange"]): ExchangeSource | null =>
  (DEPOSIT_SOURCES as string[]).includes(exchange) ? (exchange as ExchangeSource) : null;

export function CaseWorkspace() {
  const [step, setStep] = useState<CaseStep>("situation");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [source, setSource] = useState<IntakeSource>("wallet");
  const [submission, setSubmission] = useState<SubmissionDetails>(initialSubmission);
  const [walletAddress, setWalletAddress] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedTransferId, setSelectedTransferId] = useState<string>();
  const [deposits, setDeposits] = useState<ExchangeDeposit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<string>();
  const [analysis, setAnalysis] = useState<CaseAnalysis>();
  const [statement, setStatement] = useState<UserStatement>(initialStatement);
  const [report, setReport] = useState<CaseReport>();
  // 4단계(내 설명)에서 보고 있던 순서. 5단계에서 "내용 수정"으로 돌아와도 그 자리로 갑니다.
  const [statementPart, setStatementPart] = useState<StatementPart>("questions");
  // 같이 낼 파일. 내용은 이 브라우저에만 있고(blob URL), 서버에는 이름 · 크기 · 형식만 갑니다 (attachments.ts)
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [skippedSlots, setSkippedSlots] = useState<SlotId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // 단계를 넘기면 화면을 맨 위로 올립니다. 이전 단계의 스크롤 위치가 남으면 새 단계의 첫 질문이 가려집니다.
  const workspaceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    workspaceRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // 화면을 떠나면 파일 주소(blob URL)를 해제합니다
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((file) => URL.revokeObjectURL(file.url)), []);

  // 칸에 파일이 들어 있으면 그 자료를 준비한 것으로 봅니다 (따로 체크하지 않음)
  const preparedSubmission = useMemo(
    () => ({ ...submission, availableDocuments: documentsWithFiles(files) }),
    [submission, files],
  );
  const preparedStatement = useMemo(() => ({ ...statement, attachments: attachmentMeta(files) }), [statement, files]);

  const attachments: AttachmentState = {
    files,
    skipped: skippedSlots,
    onAdd: (slot, picked) => {
      const fresh: PreparedFile[] = [];
      for (const file of picked) {
        const type = acceptedType(file);
        const id = `${slot}:${file.name}:${file.size}:${file.lastModified}`;
        if (!type || files.some((item) => item.id === id) || fresh.some((item) => item.id === id)) continue;
        fresh.push({ id, slot, name: file.name, size: file.size, type, url: URL.createObjectURL(file) });
      }
      if (fresh.length > 0) setFiles((current) => [...current, ...fresh]);
      setSkippedSlots((current) => current.filter((item) => item !== slot));
    },
    onRemove: (id) => {
      const target = files.find((file) => file.id === id);
      if (target) URL.revokeObjectURL(target.url);
      setFiles((current) => current.filter((file) => file.id !== id));
    },
    onToggleSkip: (slot) =>
      setSkippedSlots((current) => (current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot])),
  };

  const currentIndex = steps.findIndex((item) => item.id === step);
  const selectedTransfer = useMemo(
    () => transfers.find((transfer) => transfer.id === selectedTransferId),
    [selectedTransferId, transfers],
  );
  const isDemo = (analysis?.scope.provider ?? transfers[0]?.sourceProvider) === "demo";

  // address를 넘기면 그 주소로 바로 조회합니다 (예시 주소 버튼은 넣고 바로 보여줍니다)
  const searchTransfers = async (address: string = walletAddress) => {
    setError(undefined);
    if (!address.trim()) {
      setError("입금을 받은 주소를 먼저 넣어 주세요. 0x로 시작하는 42자리 이더리움 주소예요.");
      return;
    }
    if (!isAddress(address.trim())) {
      setError("0x로 시작하는 42자리 이더리움 주소인지 확인해 주세요. 앞뒤 빈칸이나 빠진 글자가 없는지도 봐 주세요.");
      return;
    }
    // 붙여넣을 때 딸려 온 빈칸은 지우고, 조사에도 같은 주소를 씁니다
    address = address.trim();
    setWalletAddress(address);

    setLoading(true);
    try {
      const result = await getInboundTransfers(address);
      setTransfers(result.transfers);
      setSelectedTransferId(undefined);
    } catch (caught) {
      setError(errorMessage(caught, "입금 내역을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  const importFromMetaMask = async () => {
    setError(undefined);
    try {
      setWalletAddress(await readWalletAddress());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "주소를 가져오지 못했습니다.");
    }
  };

  // 거래소는 1단계에서 고른 것을 그대로 씁니다. 거래소를 바꾸면 다른 거래소에서 불러온 목록은 보이지 않습니다.
  // 화면은 그 거래소 계정이 이미 연결된 것처럼 보여 주고, 키를 받지 않습니다 (데모 모드 서버는 키 없이 예시 목록을 줍니다).
  const depositExchange = depositSourceOf(submission.exchange);
  const visibleDeposits = deposits.filter((deposit) => deposit.exchange === depositExchange);

  const loadDeposits = async (exchange: ExchangeSource) => {
    setError(undefined);
    setLoading(true);
    try {
      setDeposits(await getExchangeDeposits({ exchange }));
      setSelectedDepositId(undefined);
    } catch (caught) {
      setError(errorMessage(caught, "거래소 입금 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  // 연결된 거래소의 목록이 아직 없으면 바로 불러옵니다
  const showDeposits = (exchange: ExchangeSource | null) => {
    if (!exchange || loading || deposits.some((deposit) => deposit.exchange === exchange)) return;
    void loadDeposits(exchange);
  };

  // 1단계에서 넘어올 때: 고른 거래소가 연결되는 곳이면 그 입금 목록을 먼저 보여 줍니다.
  // 이미 입금 한 건을 골라 두었으면 보던 방법을 그대로 둡니다.
  const enterTransaction = () => {
    setStep("transaction");
    const next: IntakeSource = selectedTransferId || selectedDepositId ? source : depositExchange ? "exchange" : "wallet";
    setSource(next);
    if (next === "exchange") showDeposits(depositExchange);
  };

  const runAnalysis = async (wallet: string, transfer: Transfer) => {
    setError(undefined);
    setLoading(true);
    setAnalysis(undefined);
    setStep("analysis");
    try {
      setAnalysis(await analyzeCase({ walletAddress: wallet, transfer }));
    } catch (caught) {
      setError(errorMessage(caught, "조사에 실패했습니다. 다시 시도해 주세요."));
      setStep("transaction");
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (source === "wallet") {
      if (selectedTransfer) await runAnalysis(walletAddress, selectedTransfer);
      return;
    }

    // 거래소 입금 → 거래 해시로 온체인 전송 찾기 → 조사
    const deposit = visibleDeposits.find((item) => item.id === selectedDepositId);
    if (!deposit?.txHash) {
      setError("거래 해시가 없는 입금은 조사할 수 없습니다 (거래소 내부 이체일 수 있습니다).");
      return;
    }

    setError(undefined);
    setLoading(true);
    try {
      const found = await lookupTransfers(deposit.txHash);
      const transfer = found.find((item) => item.asset === deposit.asset) ?? found[0];
      if (!transfer) {
        setError("블록체인에서 해당 거래를 찾지 못했습니다.");
        setLoading(false);
        return;
      }
      setWalletAddress(transfer.to);
      setTransfers([transfer]);
      setSelectedTransferId(transfer.id);
      await runAnalysis(transfer.to, transfer);
    } catch (caught) {
      setError(errorMessage(caught, "거래를 찾지 못했습니다."));
      setLoading(false);
    }
  };

  const buildReport = async () => {
    if (!selectedTransfer) return;
    setError(undefined);
    setLoading(true);
    try {
      const result = await createReport({
        walletAddress,
        transfer: selectedTransfer,
        statement: preparedStatement,
        submission: preparedSubmission,
      });
      setAnalysis(result.analysis); // 서버가 다시 조사한 결과로 보고서를 만듭니다
      setReport(result.report);
      setStep("report");
    } catch (caught) {
      setError(errorMessage(caught, "자료를 만들지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep("situation");
    setSubmission(initialSubmission);
    setWalletAddress("");
    setTransfers([]);
    setSelectedTransferId(undefined);
    setDeposits([]);
    setSelectedDepositId(undefined);
    setAnalysis(undefined);
    setStatement(initialStatement);
    files.forEach((file) => URL.revokeObjectURL(file.url));
    setFiles([]);
    setSkippedSlots([]);
    setReport(undefined);
    setStatementPart("questions");
    setError(undefined);
  };

  const canAnalyze =
    source === "wallet" ? Boolean(selectedTransfer) : visibleDeposits.some((deposit) => deposit.id === selectedDepositId);

  return (
    <div className={sidebarOpen ? "app-shell" : "app-shell is-sidebar-collapsed"}>
      <aside className="workflow-sidebar">
        <div className="sidebar-header">
          <strong>I를가져가</strong>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="4" width="17" height="16" rx="3" />
              <path d="M9 4v16" />
              <path d={sidebarOpen ? "m15 9-3 3 3 3" : "m13 9 3 3-3 3"} />
            </svg>
          </button>
        </div>
        <nav className="step-navigation" aria-label="진행 단계">
          <ol>
            {steps.map((item, index) => {
              const isCurrent = index === currentIndex;
              const isComplete = index < currentIndex;

              return (
                <li key={item.id} className={isCurrent ? "is-current" : isComplete ? "is-complete" : ""}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={index > currentIndex || loading}
                    onClick={() => setStep(item.id)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{item.label}</b>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        {isDemo ? <p className="demo-badge">데모 데이터 · 주소와 거래는 가짜입니다</p> : null}
      </aside>

      <main className="workspace" ref={workspaceRef}>
        {step === "situation" ? (
          <SituationScreen
            submission={submission}
            onChange={setSubmission}
            onNext={enterTransaction}
          />
        ) : null}
        {step === "transaction" ? (
          <TransactionScreen
            source={source}
            onSourceChange={(next) => {
              setSource(next);
              setError(undefined);
              if (next === "exchange") showDeposits(depositExchange);
            }}
            walletAddress={walletAddress}
            transfers={transfers}
            selectedTransferId={selectedTransferId}
            onAddressChange={setWalletAddress}
            onUseExample={() => {
              setWalletAddress(EXAMPLE_WALLET);
              void searchTransfers(EXAMPLE_WALLET);
            }}
            onImportMetaMask={importFromMetaMask}
            onSearch={() => searchTransfers()}
            onSelectTransfer={setSelectedTransferId}
            depositExchange={depositExchange}
            exchangeName={submission.exchange === "unspecified" ? null : exchangeLabel(submission.exchange)}
            onChangeExchange={() => setStep("situation")}
            deposits={visibleDeposits}
            selectedDepositId={selectedDepositId}
            onReloadDeposits={() => depositExchange && void loadDeposits(depositExchange)}
            onSelectDeposit={setSelectedDepositId}
            loading={loading}
            error={error}
            canAnalyze={canAnalyze}
            onNext={startAnalysis}
          />
        ) : null}
        {step === "analysis" ? (
          <AnalysisScreen
            analysis={analysis}
            loading={loading}
            onBack={() => setStep("transaction")}
            onNext={() => {
              setStatementPart("questions");
              setStep("statement");
            }}
          />
        ) : null}
        {step === "statement" ? (
          <StatementScreen
            part={statementPart}
            onPartChange={setStatementPart}
            statement={preparedStatement}
            analysis={analysis}
            submission={preparedSubmission}
            attachments={attachments}
            onStatementChange={setStatement}
            onSubmissionChange={setSubmission}
            onEditSituation={() => setStep("situation")}
            onBack={() => setStep("analysis")}
            onNext={buildReport}
            loading={loading}
            error={error}
          />
        ) : null}
        {step === "report" ? (
          <ReportScreen
            submission={preparedSubmission}
            analysis={analysis}
            statement={preparedStatement}
            report={report}
            attachments={attachments}
            onBack={() => setStep("statement")}
            onEditPart={(part) => {
              setStatementPart(part);
              setStep("statement");
            }}
            onRestart={restart}
          />
        ) : null}
      </main>
    </div>
  );
}
