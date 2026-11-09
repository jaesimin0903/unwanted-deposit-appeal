import { AddressText } from "@/features/case/AddressText";
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
  // 거래소 입금 목록에서 찾기
  exchange: ExchangeSource;
  apiKey: string;
  apiSecret: string;
  deposits: ExchangeDeposit[];
  selectedDepositId?: string;
  onExchangeChange: (exchange: ExchangeSource) => void;
  onApiKeyChange: (value: string) => void;
  onApiSecretChange: (value: string) => void;
  onLoadDeposits: () => void;
  onSelectDeposit: (id: string) => void;
  // 공통
  loading: boolean;
  error?: string;
  canAnalyze: boolean;
  onNext: () => void;
}

const exchangeOptions: Array<{ id: ExchangeSource; label: string; note: string }> = [
  { id: "upbit", label: "업비트", note: "키 발급 때 허용 IP 등록이 필요합니다. '입금조회' 권한만 켜세요." },
  { id: "binance", label: "바이낸스", note: "읽기 전용 키만 쓰세요. 한 번에 90일까지 조회됩니다." },
];

export function TransactionScreen(props: TransactionScreenProps) {
  const { source, onSourceChange, loading, error, canAnalyze, onNext } = props;

  return (
    <section className="screen-section transaction-screen" aria-labelledby="transaction-title">
      <div className="section-heading compact-heading">
        <h1 id="transaction-title">입금 찾기</h1>
        <p>조사할 입금 한 건을 고르세요. 서명이나 개인 키는 요청하지 않습니다.</p>
      </div>

      <div className="segmented-options source-tabs" role="tablist" aria-label="입금을 찾는 방법">
        <button
          type="button"
          role="tab"
          aria-selected={source === "wallet"}
          className={source === "wallet" ? "segment-button is-selected" : "segment-button"}
          onClick={() => onSourceChange("wallet")}
        >
          지갑 주소로 찾기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === "exchange"}
          className={source === "exchange" ? "segment-button is-selected" : "segment-button"}
          onClick={() => onSourceChange("exchange")}
        >
          거래소 입금 목록에서 찾기
        </button>
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
            <p>문제가 된 입금 한 건을 고르세요.</p>
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
  exchange,
  apiKey,
  apiSecret,
  deposits,
  selectedDepositId,
  onExchangeChange,
  onApiKeyChange,
  onApiSecretChange,
  onLoadDeposits,
  onSelectDeposit,
  loading,
}: TransactionScreenProps) {
  const current = exchangeOptions.find((option) => option.id === exchange);

  return (
    <>
      <div className="exchange-form">
        <label className="select-field">
          <span>거래소</span>
          <select value={exchange} onChange={(event) => onExchangeChange(event.target.value as ExchangeSource)}>
            {exchangeOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-field compact-field">
          <span>API 키</span>
          <input value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <label className="text-field compact-field">
          <span>시크릿</span>
          <input
            type="password"
            value={apiSecret}
            onChange={(event) => onApiSecretChange(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="button" className="secondary-button" onClick={onLoadDeposits} disabled={loading}>
          {loading ? "불러오는 중" : "입금 목록 불러오기"}
        </button>
        <p className="key-note">
          {current?.note} 키는 저장하지 않고, 불러온 뒤 시크릿은 화면에서도 지웁니다. 데모 모드에서는 키 없이 예시 목록이 나옵니다.
        </p>
      </div>

      <div className="transaction-panel">
        <div className="panel-heading">
          <div>
            <h2>거래소 입금 목록</h2>
            <p>문제가 된 입금 한 건을 고르면 거래 해시로 블록체인 기록을 찾습니다.</p>
          </div>
          <span>{deposits.length}건</span>
        </div>
        <div className="transaction-list">
          {deposits.length === 0 ? (
            <div className="transaction-empty">거래소를 고르고 입금 목록을 불러오세요.</div>
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
                    <small>{deposit.txHash ? `거래 해시 ${shortAddress(deposit.txHash, 10, 6)}` : "거래 해시 없음"}</small>
                  </span>
                  <span className="transaction-meta">
                    <time>{formatKoreanDate(deposit.createdAt)}</time>
                    <small>{deposit.network} · {deposit.state}</small>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
