import { useEffect, useState } from "react";
import { AddressText } from "@/features/case/AddressText";
import { SCOPE } from "@/server/constants";
import { ANALYSIS_CHECKS, analysisQuestions, analysisSummary, analysisUnknowns } from "@/features/case/analysis-view";
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

// 요약 문장의 숫자(곳·건)를 굵게
function emphasize(text: string) {
  return text.split(/(\d[\d,]*(?:곳|건))/).map((part, index) => (index % 2 === 1 ? <b key={index}>{part}</b> : part));
}

function uniqueSources(sources: SourceRef[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.label}|${source.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 조사 중: 질문 4개를 함께 조회하고, 결과가 오면 하나씩 답을 붙입니다
function AnalysisProgress({ analysis, revealed }: { analysis?: CaseAnalysis; revealed: number }) {
  const answers = new Map(analysis ? analysisQuestions(analysis).map((question) => [question.id, question.answer]) : []);

  return (
    <section className="analysis-progress" aria-live="polite">
      <div className="progress-card">
        <h1>온체인 기록 조사 중</h1>
        <p>입금 시각을 기준으로 조회합니다.</p>
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
  const questions = analysisQuestions(analysis);
  const unknowns = analysisUnknowns(analysis);

  return (
    <section className="screen-section analysis-screen" aria-labelledby="analysis-title">
      <header className="onchain-head">
        <div>
          <h1 id="analysis-title">온체인 조사</h1>
          <p className="onchain-lead">블록체인에 남은 기록으로 이 입금을 확인했어요. 아래 결과는 고르거나 고칠 수 없고, 소명서에 그대로 들어가요.</p>
          <p className="onchain-meta">
            <b>{transfer.displayValue} {transfer.asset}</b> · {formatKoreanDateTime(transfer.timestamp)} · 보낸 주소{" "}
            <code>{shortAddress(transfer.from, 6, 4)}</code>
          </p>
        </div>
        <a className="source-button" href={transfer.explorerUrl} target="_blank" rel="noreferrer">
          블록체인 기록 보기 ↗
        </a>
      </header>

      <p className="onchain-summary">{emphasize(analysisSummary(analysis))}</p>

      <div className="onchain-body">
        <SpreadGraph analysis={analysis} />
        <div className="question-grid">
          {questions.map((question) => (
            <article key={question.id} className={question.caution ? "question-card is-caution" : "question-card"}>
              <h2>{question.question}</h2>
              <p className="question-answer">{question.answer}</p>
              <p className="question-detail">
                <AddressText text={question.detail} />
              </p>
              <p className="question-meaning">{question.meaning}</p>
              <div className="question-foot">
                <span className={`category-chip is-${question.category}`}>{categoryLabels[question.category]}</span>
                <span className="question-sources">
                  {uniqueSources(question.sources).slice(0, 2).map((source, index) =>
                    source.url ? (
                      <a key={index} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>
                    ) : (
                      <span key={index}>{source.label}</span>
                    ),
                  )}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="onchain-foot">
        <p className="unknown-strip">
          <span className="category-chip is-unverifiable">{categoryLabels.unverifiable}</span>
          {unknowns.map((item) => item.title).join(" · ")}
        </p>
        <button
          type="button"
          className="text-button details-toggle"
          aria-expanded={showDetails}
          aria-controls="analysis-details"
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? "조사 범위 접기 ▴" : "조사 범위와 전체 기록 ▾"}
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
