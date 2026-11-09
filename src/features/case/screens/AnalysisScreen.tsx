import { useEffect, useState } from "react";
import { AddressText } from "@/features/case/AddressText";
import { SCOPE } from "@/server/constants";
import { ANALYSIS_CHECKS, plainFindings, type QuestionId } from "@/features/case/analysis-view";
import { SourceLinks } from "@/features/case/SourceLinks";
import { SpreadGraph } from "@/features/case/SpreadGraph";
import { categoryLabels, formatKoreanDateTime, providerLabels, shortAddress } from "@/features/case/utils";
import type { CaseAnalysis, SourceRef } from "@/types/case";

interface AnalysisScreenProps {
  analysis?: CaseAnalysis;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}

const CHECK_COUNT = ANALYSIS_CHECKS.length;
const REVEAL_STEP_MS = 450;

function uniqueSources(sources: SourceRef[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.label}|${source.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 결과 칸 아이콘: 이전 거래(⇄), 퍼짐(한 곳 → 여러 곳), 돌려보냄(↩), 목록
function FindingIcon({ id }: { id: QuestionId }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="result-icon">
      {id === "prior" ? <path d="M3 7h12l-3-3M17 13H5l3 3" /> : null}
      {id === "spray" ? (
        <>
          <circle cx="4" cy="10" r="2" />
          <path d="M6 10l9-6M6 10h9M6 10l9 6" />
          <circle cx="16.5" cy="4" r="1.2" />
          <circle cx="16.5" cy="10" r="1.2" />
          <circle cx="16.5" cy="16" r="1.2" />
        </>
      ) : null}
      {id === "after" ? <path d="M8 4 4 8l4 4M4 8h8a4 4 0 0 1 0 8H8" /> : null}
      {id === "sanctions" ? <path d="M4 3h12v14H4zM7 7h6M7 10h6M7 13h3" /> : null}
    </svg>
  );
}

// 조사 중: 질문 4개를 함께 조회하고, 결과가 오면 하나씩 답을 붙입니다
function AnalysisProgress({ analysis, revealed }: { analysis?: CaseAnalysis; revealed: number }) {
  const answers = new Map(analysis ? plainFindings(analysis).map((finding) => [finding.id, finding.answer]) : []);

  return (
    <section className="analysis-progress" aria-live="polite">
      <div className="progress-card">
        <h1>블록체인 기록 확인 중</h1>
        <p>이 입금 앞뒤의 공개 기록을 찾고 있어요.</p>
        <ol className="progress-checks">
          {ANALYSIS_CHECKS.map((check, index) => {
            const done = Boolean(analysis) && index < revealed;
            return (
              <li key={check.id} className={done ? "progress-check is-done" : "progress-check is-running"}>
                <span className="progress-mark">
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 L5 9 L10 3" /></svg>
                </span>
                <span className="progress-label">{check.label}</span>
                <span className="progress-result">{done ? answers.get(check.id) : "조회 중"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function AnalysisScreen({ analysis, loading, onBack, onNext }: AnalysisScreenProps) {
  // 이 화면에서 조사를 기다린 경우에만 답을 하나씩 보여줍니다. 뒤로 와서 다시 볼 때는 바로 결과.
  const [animate] = useState(() => loading || !analysis);
  const [revealed, setRevealed] = useState(() => (loading || !analysis ? 0 : CHECK_COUNT + 1));
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!animate || !analysis) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduce ? 0 : REVEAL_STEP_MS;
    // 마지막 답 뒤에 한 박자 쉬고 결과 화면으로
    const timers = Array.from({ length: CHECK_COUNT + 1 }, (_, index) =>
      window.setTimeout(() => setRevealed(index + 1), step * (index + 1) + (index === CHECK_COUNT ? step : 0)),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [animate, analysis]);

  if (!analysis || revealed <= CHECK_COUNT) {
    return <AnalysisProgress analysis={analysis} revealed={revealed} />;
  }

  const { transfer, scope, sanctions } = analysis;
  const findings = plainFindings(analysis);

  return (
    <section className="screen-section analysis-screen" aria-labelledby="analysis-title">
      <header className="onchain-head">
        <div>
          <h1 id="analysis-title">블록체인 기록 확인</h1>
          <p className="onchain-lead">공개 장부(블록체인)에 남은 기록으로 이 입금을 확인했어요.</p>
        </div>
        <a className="source-button" href={transfer.explorerUrl} target="_blank" rel="noreferrer">
          원본 기록 ↗
        </a>
      </header>

      {/* 받은 입금 한 건: 보낸 주소 → 내 지갑 */}
      <div className="deposit-strip" aria-label={`보낸 주소 ${shortAddress(transfer.from, 6, 4)}에서 내 지갑으로 ${transfer.displayValue} ${transfer.asset}`}>
        <span className="strip-node">
          <small>보낸 주소</small>
          <code>{shortAddress(transfer.from, 6, 4)}</code>
        </span>
        <span className="strip-flow" aria-hidden="true">
          <b>{transfer.displayValue} {transfer.asset}</b>
          <i />
          <small>{formatKoreanDateTime(transfer.timestamp)}</small>
        </span>
        <span className="strip-node is-mine">
          <small>받은 곳</small>
          <b>내 지갑</b>
        </span>
      </div>

      <ul className="result-grid">
        {findings.map((finding) => (
          <li key={finding.id} className={finding.caution ? "result-tile is-caution" : "result-tile"}>
            <p className="result-label">
              <FindingIcon id={finding.id} />
              {finding.label}
            </p>
            <p className="result-answer">{finding.answer}</p>
            <p className="result-short">{finding.short}</p>
            {finding.extra ? <p className="result-flag">입금 뒤 다른 곳으로 보낸 기록이 있어요 · 자세히</p> : null}
            <details className="result-more">
              <summary>자세히</summary>
              <p>{finding.explain}</p>
              {finding.id === "spray" && analysis.facts.similarAmountCount > 1 ? <SpreadGraph analysis={analysis} /> : null}
              {finding.extra ? (
                <p className="result-extra">
                  <AddressText text={finding.extra} />
                </p>
              ) : null}
              <p className="result-sources">
                <span className={`category-chip is-${finding.category}`}>{categoryLabels[finding.category]}</span>
                {uniqueSources(finding.sources).slice(0, 2).map((source, sourceIndex) =>
                  source.url ? (
                    <a key={sourceIndex} href={source.url} target="_blank" rel="noreferrer">
                      {source.label} ↗
                    </a>
                  ) : (
                    <span key={sourceIndex}>{source.label}</span>
                  ),
                )}
              </p>
            </details>
          </li>
        ))}
      </ul>

      <p className="unknown-line">
        <b>기록으로 알 수 없는 것</b>
        <span>내 의도 · 보낸 사람과 아는 사이인지 · 받은 코인을 썼는지</span>
        <em>→ 다음 단계에서 직접 답해요</em>
      </p>

      <div className="onchain-foot">
        <p className="finding-note">이 결과는 고칠 수 없고, 원본 링크와 함께 소명서에 들어가요.</p>
        <button
          type="button"
          className="text-button details-toggle"
          aria-expanded={showDetails}
          aria-controls="analysis-details"
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? "조사 범위 접기 ▴" : "조사 범위 ▾"}
        </button>
      </div>

      <div className="onchain-details" id="analysis-details" hidden={!showDetails}>
        <dl className="scope-box" aria-label="조사 범위">
          <div><dt>비슷한 금액</dt><dd>{scope.windowLabel} ({formatKoreanDateTime(scope.windowStart)} ~ {formatKoreanDateTime(scope.windowEnd)})</dd></div>
          <div><dt>이전 거래</dt><dd>입금 전 기록 전체 (최대 {scope.maxTransfers.toLocaleString("en-US")}건)</dd></div>
          <div><dt>입금 후 전송</dt><dd>입금 후 {SCOPE.afterDepositDays}일</dd></div>
          <div>
            <dt>조회 건수</dt>
            <dd>
              {scope.fetchedTransfers.toLocaleString("en-US")}건 (최대 {scope.maxTransfers.toLocaleString("en-US")}건까지 조회)
              {scope.complete ? "" : " · 최대치에 걸려 일부만 조회"}
            </dd>
          </div>
          <div><dt>제재 목록</dt><dd>{sanctions.listName} ({sanctions.listUpdatedAt} 기준) · {sanctions.senderMatched ? "일치" : "일치하지 않음"}</dd></div>
          <div><dt>데이터</dt><dd>{providerLabels[scope.provider]} · {formatKoreanDateTime(scope.fetchedAt)} 조회</dd></div>
        </dl>
        <div className="evidence-list">
          {analysis.evidence.map((item) => (
            <article key={item.id} className={`evidence-item evidence-${item.category}`}>
              <span>{categoryLabels[item.category]}</span>
              <h3>
                <AddressText text={item.title} />
              </h3>
              <p>
                <AddressText text={item.description} />
              </p>
              <SourceLinks sources={item.sources} />
            </article>
          ))}
        </div>
      </div>

      <div className="screen-actions">
        <button className="secondary-button" type="button" onClick={onBack}>이전</button>
        <button className="primary-button" type="button" onClick={onNext}>다음 · 내 설명</button>
      </div>
    </section>
  );
}
