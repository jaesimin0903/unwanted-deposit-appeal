import { AddressText } from "@/features/case/AddressText";
import { ExchangeLogo } from "@/features/case/ExchangeLogo";
import { formatKoreanDate, shortAddress } from "@/features/case/utils";
import type { ExchangeDeposit, ExchangeSource, Transfer } from "@/types/case";

export type IntakeSource = "wallet" | "exchange";

interface TransactionScreenProps {
  source: IntakeSource;
  onSourceChange: (source: IntakeSource) => void;
  // 지갑 주소로 찾기
  walletAddress: string;
  transfers: Transfer[];
  selectedTransferId?: string;
  onAddressChange: (value: string) => void;
  onUseExample: () => void;
  onImportMetaMask: () => void;
  onSearch: () => void;
  onSelectTransfer: (id: string) => void;
  // 거래소 입금 목록에서 찾기. 거래소는 1단계에서 고른 것을 씁니다 (여기서 다시 고르지 않음).
  // 키를 넣는 과정은 보여 주지 않고, 그 거래소 계정이 이미 연결된 화면으로 보여 줍니다.
  depositExchange: ExchangeSource | null; // 1단계 거래소가 입금 목록을 불러올 수 있는 곳이면 그 거래소
  exchangeName: string | null; // 1단계에서 고른 거래소 이름 (고르지 않았으면 null)
  onChangeExchange: () => void; // 1단계로 돌아가 거래소 바꾸기
  deposits: ExchangeDeposit[];
  selectedDepositId?: string;
  onReloadDeposits: () => void;
  onSelectDeposit: (id: string) => void;
  // 공통
  loading: boolean;
  error?: string;
  canAnalyze: boolean;
  onNext: () => void;
}

// 거래소가 주는 입금 상태 값을 읽을 수 있는 말로 (업비트 · 바이낸스 상태 이름). 모르는 값은 그대로 둡니다.
const DEPOSIT_STATES: Record<string, string> = {
  ACCEPTED: "입금 완료",
  PROCESSING: "처리 중",
  CANCELLED: "취소",
  REJECTED: "거절",
  TRAVEL_RULE_SUSPECTED: "확인 대기",
  REFUNDING: "반환 중",
  REFUNDED: "반환됨",
};
const depositStateLabel = (state: string) => DEPOSIT_STATES[state.toUpperCase()] ?? state;

export function TransactionScreen(props: TransactionScreenProps) {
  const { source, onSourceChange, depositExchange, exchangeName, loading, error, canAnalyze, onNext } = props;
  const walletTab = { id: "wallet" as const, label: "지갑 주소로 찾기" };
  const exchangeTab = {
    id: "exchange" as const,
    label: depositExchange ? `${exchangeName} 입금 목록에서 찾기` : "거래소 입금 목록에서 찾기",
  };
  // 연결된 거래소가 있으면 그 입금 목록이 첫 번째 방법입니다
  const tabs = depositExchange ? [exchangeTab, walletTab] : [walletTab, exchangeTab];

  return (
    <section className="screen-section transaction-screen" aria-labelledby="transaction-title">
      <div className="section-heading compact-heading">
        <h1 id="transaction-title">입금 찾기</h1>
        <p>조사할 입금 한 건을 고르세요. 서명이나 개인 키는 요청하지 않습니다.</p>
      </div>

      <div className="segmented-options source-tabs" role="tablist" aria-label="입금을 찾는 방법">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={source === tab.id}
            className={source === tab.id ? "segment-button is-selected" : "segment-button"}
            onClick={() => onSourceChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {source === "wallet" ? <WalletIntake {...props} /> : <ExchangeIntake {...props} />}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="screen-actions screen-actions-end">
        <button className="primary-button" type="button" onClick={onNext} disabled={!canAnalyze || loading}>
          {loading ? "확인 중" : "이 입금 조사하기"}
        </button>
      </div>
    </section>
  );
}

function WalletIntake({
  walletAddress,
  transfers,
  selectedTransferId,
  onAddressChange,
  onUseExample,
  onImportMetaMask,
  onSearch,
  onSelectTransfer,
  loading,
}: TransactionScreenProps) {
  return (
    <>
      <div className="address-search">
        <label>
          <span>입금을 받은 주소 (이더리움)</span>
          <input
            value={walletAddress}
            placeholder="0x로 시작하는 42자리 주소"
            onChange={(event) => onAddressChange(event.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <button type="button" className="secondary-button" onClick={onSearch} disabled={loading}>
          {loading ? "조회 중" : "입금 내역 조회"}
        </button>
        <div className="address-helpers">
          <button type="button" className="text-button" onClick={onImportMetaMask}>
            메타마스크에서 주소 가져오기
          </button>
          <button type="button" className="text-button" onClick={onUseExample}>
            예시 주소로 보기
          </button>
          <small>메타마스크는 주소만 읽습니다. 서명 요청은 하지 않습니다.</small>
        </div>
        <p className="address-hint">
          거래소 계정으로 받았다면 거래소 앱의 <b>입출금 &gt; 이더리움 &gt; 입금 주소</b>를, 개인 지갑으로 받았다면 그 지갑 주소를 넣으세요.
        </p>
      </div>

      <div className="transaction-panel">
        <div className="panel-heading">
          <div>
            <h2>받은 거래</h2>
            <p>모르는 입금(문제가 된 입금) 한 건을 고르세요. 고른 입금의 블록체인 기록을 조사해요.</p>
          </div>
          <span>{transfers.length}건</span>
        </div>

        {loading ? (
          <div className="loading-list" aria-label="입금 내역을 불러오는 중">
            <i /><i /><i />
          </div>
        ) : (
          <div className="transaction-list">
            {transfers.length === 0 ? (
              <div className="transaction-empty">주소를 입력한 뒤 입금 내역을 조회하세요.</div>
            ) : (
              transfers.map((transfer) => {
                const selected = selectedTransferId === transfer.id;
                return (
                  <button
                    type="button"
                    className={selected ? "transaction-row is-selected" : "transaction-row"}
                    key={transfer.id}
                    onClick={() => onSelectTransfer(transfer.id)}
                  >
                    <span className="radio-mark" aria-hidden="true" />
                    <span className="transaction-main">
                      <b>{transfer.displayValue} {transfer.asset}</b>
                      <small>
                        <AddressText text={shortAddress(transfer.from, 8, 6)} />에서 받음
                      </small>
                    </span>
                    <span className="transaction-meta">
                      <time>{formatKoreanDate(transfer.timestamp)}</time>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ExchangeIntake({
  depositExchange,
  exchangeName,
  onChangeExchange,
  onSourceChange,
  deposits,
  selectedDepositId,
  onReloadDeposits,
  onSelectDeposit,
  loading,
}: TransactionScreenProps) {
  // 1단계 거래소가 입금 목록을 불러올 수 없는 곳이면, 주소로 찾는 길을 안내합니다
  if (!depositExchange) {
    return (
      <div className="exchange-unsupported">
        {exchangeName ? (
          <p>
            <b>{exchangeName} 계정은 아직 연결이 안 돼요</b> (업비트 · 바이낸스만 돼요). {exchangeName} 앱의 입금 주소를 넣으면 같은 입금을 찾을 수
            있어요.
          </p>
        ) : (
          <p>
            <b>1단계에서 거래소를 고르지 않았어요.</b> 업비트나 바이낸스를 고르면 그 계정의 입금 목록을 바로 볼 수 있어요. 다른 거래소라면 거래소 앱의
            입금 주소를 넣어 찾으세요.
          </p>
        )}
        <div className="exchange-unsupported-actions">
          <button type="button" className="secondary-button" onClick={() => onSourceChange("wallet")}>
            지갑 주소로 찾기
          </button>
          <button type="button" className="text-button" onClick={onChangeExchange}>
            1단계에서 거래소 {exchangeName ? "바꾸기" : "고르기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="exchange-connected">
        <ExchangeLogo id={depositExchange} size={36} className="exchange-mark" />
        <div className="exchange-connected-main">
          <p>
            <b>{exchangeName} 계정</b>
            <span className="connected-badge">연결됨</span>
          </p>
          <small>입금 내역만 읽어요. 주문이나 출금은 하지 않아요.</small>
        </div>
        <button type="button" className="text-button" onClick={onChangeExchange}>
          1단계에서 거래소 바꾸기
        </button>
      </div>

      <div className="transaction-panel">
        <div className="panel-heading">
          <div>
            <h2>{exchangeName} 입금 목록</h2>
            <p>모르는 입금(문제가 된 입금) 한 건을 고르세요. 고른 입금의 블록체인 기록을 조사해요.</p>
          </div>
          <span>{deposits.length}건</span>
        </div>
        {loading && deposits.length === 0 ? (
          <div className="loading-list" aria-label={`${exchangeName} 입금 목록을 불러오는 중`}>
            <i /><i /><i />
          </div>
        ) : (
          <div className="transaction-list">
            {deposits.length === 0 ? (
              <div className="transaction-empty">
                <span>
                  입금 목록이 비어 있어요.{" "}
                  <button type="button" className="text-button" onClick={onReloadDeposits}>
                    다시 불러오기
                  </button>
                </span>
              </div>
            ) : (
              deposits.map((deposit) => {
                const selected = selectedDepositId === deposit.id;
                return (
                  <button
                    type="button"
                    className={selected ? "transaction-row is-selected" : "transaction-row"}
                    key={deposit.id}
                    onClick={() => onSelectDeposit(deposit.id)}
                  >
                    <span className="radio-mark" aria-hidden="true" />
                    <span className="transaction-main">
                      <b>{deposit.amount} {deposit.asset}</b>
                      <small>{deposit.txHash ? `거래 번호 ${shortAddress(deposit.txHash, 10, 6)}` : "거래 번호 없음 (거래소 안 이체)"}</small>
                    </span>
                    <span className="transaction-meta">
                      <time>{formatKoreanDate(deposit.createdAt)}</time>
                      <small>{deposit.network} · {depositStateLabel(deposit.state)}</small>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
