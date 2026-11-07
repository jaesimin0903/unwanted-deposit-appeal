import { useState } from "react";
import {
  DOCUMENT_LABELS,
  GROUPS,
  PROFILE_ORDER,
  PROFILES,
  RESTRICTION_DESCRIPTIONS,
  RESTRICTION_LABELS,
  SCOPE_LABELS,
  getProfile,
  getSubmissionRoute,
  todayInSeoul,
} from "@/profiles";
import { parseNotice } from "@/features/case/notice";
import { daysLeftLabel } from "@/features/case/utils";
import type { ExchangeId, ProfileField, RestrictionScope, RestrictionType, SubmissionDetails } from "@/types/case";

// 1단계: 어떤 제한을 받았고, 어느 거래소에 내는지
// 왼쪽은 입력, 오른쪽은 결론(제출처 · 기한 · 준비할 자료)을 먼저 보여주고
// 근거 약관은 한 줄씩 접어 두었다가 눌러서 원문을 봅니다.
// 제출처와 기한은 거래소보다 제한 유형에 따라 먼저 갈립니다 (리서치 5-2).

interface SituationScreenProps {
  submission: SubmissionDetails;
  onChange: (submission: SubmissionDetails) => void;
  onNext: () => void;
}

const restrictionOrder: RestrictionType[] = ["internal", "sanction", "phishing", "unknown"];
const scopeOrder: RestrictionScope[] = ["deposit", "withdraw", "account", "unknown"];

const baseDateLabels: Record<RestrictionType, string | null> = {
  internal: "자료 제출 기한",
  phishing: "채권소멸절차 개시 공고일",
  sanction: null,
  unknown: null,
};

const baseDateHints: Record<RestrictionType, string> = {
  internal: "거래소 통지에 적힌 날짜",
  phishing: "공고문에 적힌 날짜",
  sanction: "",
  unknown: "",
};

const fieldStatusLabels = {
  verified: "확인",
  check: "확인 필요",
  caution: "주의",
} as const;

type EvidenceRow = ProfileField & { scope: string; common: boolean };

// 근거 약관 한 줄: 칸 이름 · 첫 부분 · 확인 여부만 보이고, 누르면 원문과 출처가 펼쳐집니다.
function EvidenceRows({ rows }: { rows: EvidenceRow[] }) {
  return (
    <ul className="evidence-rows">
      {rows.map((row) => (
        <li key={`${row.scope}-${row.label}`}>
          <details>
            <summary>
              <b>
                {row.label}
                {row.common ? <em className="evidence-scope">공통</em> : null}
              </b>
              <span className="evidence-preview">{row.value}</span>
              <span className={`evidence-state is-${row.status}`}>{fieldStatusLabels[row.status]}</span>
            </summary>
            <div className="evidence-body">
              <p>{row.value}</p>
              {row.source ? (
                <span className={`field-chip is-${row.status}`}>
                  {row.scope} ·{" "}
                  {row.source.url ? (
                    <a href={row.source.url} target="_blank" rel="noreferrer">
                      {row.source.label} ↗
                    </a>
                  ) : (
                    row.source.label
                  )}
                </span>
              ) : (
                <span className="field-chip is-check">{row.scope} · 공개 자료에서 찾지 못함</span>
              )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

export function SituationScreen({ submission, onChange, onNext }: SituationScreenProps) {
  const profile = getProfile(submission.exchange);
  const group = profile ? GROUPS[profile.group] : null;
  const today = todayInSeoul();
  const route = getSubmissionRoute(submission, today);
  const daysLeft = daysLeftLabel(route.deadline.date, today);

  // 붙여넣은 통지에서 찾은 값 중 지금 입력과 다른 것만 제안합니다 (적용은 사용자가 누를 때만)
  const hints = parseNotice(submission.requestText, today);
  const suggestion: Partial<SubmissionDetails> = {};
  if (hints.restrictionType && hints.restrictionType !== submission.restrictionType) suggestion.restrictionType = hints.restrictionType;
  if (hints.scope && hints.scope !== submission.scope) suggestion.scope = hints.scope;
  if (hints.exchange && hints.exchange !== submission.exchange) suggestion.exchange = hints.exchange;
  // 통지의 "…까지" 날짜는 거래소 내부 심사의 자료 제출 기한일 때만 기한 칸에 넣습니다
  const typeAfterApply = suggestion.restrictionType ?? submission.restrictionType;
  if (hints.deadline && typeAfterApply === "internal" && hints.deadline !== submission.baseDate) suggestion.baseDate = hints.deadline;
  const hasSuggestion = Object.keys(suggestion).length > 0;
  // 이미 고른 값과 통지가 다른지 (비어 있는 칸만 채우는 경우와 말을 다르게 합니다)
  const conflicts =
    (suggestion.restrictionType !== undefined && submission.restrictionType !== "unknown") ||
    (suggestion.scope !== undefined && submission.scope !== "unknown") ||
    (suggestion.exchange !== undefined && submission.exchange !== "unspecified") ||
    (suggestion.baseDate !== undefined && submission.baseDate !== "");
  const applySuggestion = () => onChange({ ...submission, ...suggestion });

  // 통지를 붙여넣으면 아직 고르지 않은 칸만 바로 채웁니다. 사용자가 이미 고른 값은 덮어쓰지 않고, 되돌릴 수 있게 남겨 둡니다.
  const [autoFill, setAutoFill] = useState<{ before: Partial<SubmissionDetails>; labels: string[] } | null>(null);
  const changeNotice = (text: string) => {
    const found = parseNotice(text, today);
    const next: SubmissionDetails = { ...submission, requestText: text };
    const before: Partial<SubmissionDetails> = {};
    const labels: string[] = [];
    if (found.exchange && submission.exchange === "unspecified") {
      before.exchange = submission.exchange;
      next.exchange = found.exchange;
      labels.push(PROFILES[found.exchange].name);
    }
    if (found.scope && submission.scope === "unknown") {
      before.scope = submission.scope;
      next.scope = found.scope;
      labels.push(SCOPE_LABELS[found.scope]);
    }
    if (found.restrictionType && submission.restrictionType === "unknown") {
      before.restrictionType = submission.restrictionType;
      next.restrictionType = found.restrictionType;
      labels.push(RESTRICTION_LABELS[found.restrictionType]);
    }
    if (found.deadline && next.restrictionType === "internal" && !submission.baseDate) {
      before.baseDate = submission.baseDate;
      next.baseDate = found.deadline;
      labels.push(`기한 ${found.deadline}`);
    }
    if (labels.length > 0) {
      setAutoFill({ before: { ...before, ...autoFill?.before }, labels: [...(autoFill?.labels ?? []), ...labels] });
    }
    onChange(next);
  };
  const undoAutoFill = () => {
    if (autoFill) onChange({ ...submission, ...autoFill.before });
    setAutoFill(null);
  };
  const baseDateLabel = baseDateLabels[submission.restrictionType];
  const verified = profile?.status === "verified";

  // 준비할 자료: 공개 자료로 확인한 거래소는 그 거래소 목록, 아니면 국내 · 해외 공통 목록
  const documents = profile ? (verified ? profile.requestedDocuments : group?.requestedDocuments ?? []) : [];
  const documentsNote = profile
    ? verified
      ? `${profile.name} 공개 자료에 나온 자료`
      : `${group?.name} 공통 기준 (${profile.name} 자료는 아직 확인 전)`
    : "";

  const evidence: EvidenceRow[] =
    profile && group
      ? [
          ...profile.fields.map((field) => ({ ...field, scope: profile.name, common: false })),
          ...group.fields.map((field) => ({ ...field, scope: `${group.name} 공통`, common: true })),
        ]
      : [];
  const confirmed = evidence.filter((row) => row.status === "verified").length;
  // 공개 자료에서 찾지 못한 칸 (사용자가 할 일이 아니라 거래소가 공개하지 않은 것)
  const missingLabels = evidence.filter((row) => row.status !== "verified").map((row) => row.label);

  const selectExchange = (exchange: ExchangeId) => onChange({ ...submission, exchange });

  return (
    <section className="screen-section" aria-labelledby="situation-title">
      <div className="section-heading compact-heading">
        <h1 id="situation-title">상황</h1>
        <p>받은 제한과 거래소를 고르면 어디에, 언제까지, 무엇을 낼지 바로 정리됩니다.</p>
      </div>

      <div className="board-layout">
        <div className="board-inputs">
          <section className="board-block" aria-labelledby="paste-title">
            <h2 id="paste-title">
              <span className="board-step">1</span>받은 통지 붙여넣기 <small>선택</small>
            </h2>
            <label className="text-field compact-field">
              <span className="visually-hidden">거래소에서 받은 문구</span>
              <textarea
                rows={2}
                placeholder="알림톡 · 문자 · 메일로 받은 문구를 붙여넣으면 아래 칸을 채워 드려요."
                value={submission.requestText}
                onChange={(event) => changeNotice(event.target.value)}
              />
            </label>
            {autoFill ? (
              <div className="notice-hints" role="status">
                <span>
                  통지에서 채운 칸: <b>{autoFill.labels.join(" · ")}</b>
                </span>
                <button type="button" className="text-button" onClick={undoAutoFill}>
                  되돌리기
                </button>
              </div>
            ) : null}
            {hasSuggestion ? (
              // 이미 고른 값이 통지와 다를 때만 묻습니다
              <div className={conflicts ? "notice-hints is-conflict" : "notice-hints"} role="status">
                <span>
                  {conflicts ? "통지 내용과 다른 칸이 있어요" : "통지에서 찾은 것"}: <b>{hints.found.join(" · ")}</b>
                </span>
                <button type="button" className="primary-button notice-apply" onClick={applySuggestion}>
                  {conflicts ? "통지대로 바꾸기" : "아래 칸에 채우기"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="board-block" aria-labelledby="restriction-title">
            <h2 id="restriction-title">
              <span className="board-step">2</span>어떤 제한을 받았나요?
            </h2>
            <div className="restriction-grid" role="radiogroup" aria-labelledby="restriction-title">
              {restrictionOrder.map((type) => (
                <label key={type} className={submission.restrictionType === type ? "restriction-card is-selected" : "restriction-card"}>
                  <input
                    type="radio"
                    name="restriction-type"
                    value={type}
                    checked={submission.restrictionType === type}
                    onChange={() => onChange({ ...submission, restrictionType: type, baseDate: "" })}
                  />
                  <b>{RESTRICTION_LABELS[type]}</b>
                  <small>{RESTRICTION_DESCRIPTIONS[type]}</small>
                </label>
              ))}
            </div>
          </section>

          <section className="board-block" aria-labelledby="exchange-title">
            <h2 id="exchange-title">
              <span className="board-step">3</span>어느 거래소에 내나요?
            </h2>
            {(["kr", "intl"] as const).map((groupId) => (
              <div key={groupId} className="exchange-row">
                <span className="exchange-group-label">{groupId === "kr" ? "국내" : "해외"}</span>
                <div className="exchange-chips" role="group" aria-label={GROUPS[groupId].name}>
                  {PROFILE_ORDER[groupId].map((id) => {
                    const item = PROFILES[id];
                    const selected = submission.exchange === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        title={item.status === "verified" ? "공개 자료 확인" : "리서치 중 · 공통 기준"}
                        className={[
                          "exchange-chip",
                          selected ? "is-selected" : "",
                          item.status === "verified" ? "" : "is-unverified",
                        ].join(" ")}
                        onClick={() => selectExchange(id)}
                      >
                        {item.status === "fallback" ? "그 외" : item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="board-block" aria-labelledby="notice-title">
            <h2 id="notice-title">
              <span className="board-step">4</span>통지 내용 <small>모르면 비워 두세요</small>
            </h2>
            <div className="notice-row">
              <label className="select-field">
                <span>막힌 범위</span>
                <select
                  value={submission.scope}
                  onChange={(event) => onChange({ ...submission, scope: event.target.value as RestrictionScope })}
                >
                  {scopeOrder.map((scope) => (
                    <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
                  ))}
                </select>
              </label>
              <label className="text-field compact-field">
                <span>통지받은 날</span>
                <input
                  type="date"
                  value={submission.noticeDate}
                  onChange={(event) => onChange({ ...submission, noticeDate: event.target.value })}
                />
              </label>
              {baseDateLabel ? (
                <label className="text-field compact-field">
                  <span title={baseDateHints[submission.restrictionType]}>{baseDateLabel}</span>
                  <input
                    type="date"
                    value={submission.baseDate}
                    aria-describedby="base-date-hint"
                    onChange={(event) => onChange({ ...submission, baseDate: event.target.value })}
                  />
                </label>
              ) : null}
            </div>
            {baseDateLabel ? (
              <p id="base-date-hint" className="board-hint">
                {baseDateLabel}: {baseDateHints[submission.restrictionType]}. 넣으면 남은 날을 계산해요. 통지받은 날은 소명서에 통지일로 적혀요.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="board-result" aria-labelledby="result-title">
          <section className={`result-card deadline-${route.deadline.status}`}>
            <div className="result-head">
              <h2 id="result-title">{profile ? `${profile.name}에 이렇게 냅니다` : "어디에, 언제까지 낼까요"}</h2>
              {profile ? (
                <span className={`field-chip is-${verified ? "verified" : "check"}`}>
                  {verified ? "공개 자료 확인" : profile.status === "research" ? "리서치 중" : "공통 기준만"}
                </span>
              ) : null}
            </div>
            <dl className="result-rows">
              <div>
                <dt>제출처</dt>
                <dd className="result-main">{route.submitTo}</dd>
              </div>
              <div>
                <dt>기한</dt>
                <dd className="result-main route-deadline">
                  {route.deadline.text}
                  {daysLeft ? <span className="days-left">{daysLeft}</span> : null}
                </dd>
              </div>
              {route.reviewPeriod ? (
                <div>
                  <dt>심사 기간</dt>
                  <dd>{route.reviewPeriod}</dd>
                </div>
              ) : null}
              <div>
                <dt>준비할 자료</dt>
                <dd>
                  {documents.length > 0 ? (
                    <>
                      <ul className="result-docs">
                        {documents.map((id) => (
                          <li key={id}>{DOCUMENT_LABELS[id]}</li>
                        ))}
                      </ul>
                      <small>{documentsNote}</small>
                    </>
                  ) : profile ? (
                    <small>공개된 자료 목록이 없습니다. 통지에 적힌 자료를 따르세요.</small>
                  ) : (
                    <small>거래소를 고르면 보여줍니다. 몰라도 다음으로 넘어갈 수 있습니다.</small>
                  )}
                </dd>
              </div>
            </dl>
            {hints.asksSourceOfFunds ? (
              <p className="result-callout">
                통지가 <b>자금 출처</b> 자료를 요구해요. 이 도구는 모르는 입금에 대한 설명서를 만들어요. 내 자산이 어디서 왔는지 보여주는 자료(원화 입금 · 매수
                내역, 급여 · 이체 내역 등)는 따로 준비해 같이 내야 해요.
              </p>
            ) : null}
            {route.notes.length > 0 ? (
              <ul className="result-notes">
                {route.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {evidence.length > 0 && profile ? (
            <section className="evidence-panel" aria-labelledby="evidence-title">
              <div className="evidence-head">
                <h3 id="evidence-title">근거 약관 · 공개 자료</h3>
                <span>
                  공개 자료로 {confirmed}개 확인
                  {missingLabels.length > 0 ? ` · 공개 자료에 없음: ${missingLabels.join(", ")}` : ""}
                </span>
              </div>
              <EvidenceRows rows={evidence} />
              <p className="profile-note">
                줄을 누르면 원문이 펼쳐집니다 · {profile.checkedAt ? `확인일 ${profile.checkedAt} · ` : ""}비공식 정리 (거래소 공식 양식 아님)
              </p>
            </section>
          ) : null}

          <div className="board-next">
            <button className="primary-button" type="button" onClick={onNext}>
              다음 · 입금 찾기
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
