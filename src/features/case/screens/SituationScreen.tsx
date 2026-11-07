import {
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
import type { ExchangeId, ProfileField, RestrictionScope, RestrictionType, SubmissionDetails } from "@/types/case";

// 1단계: 어떤 제한을 받았고, 어느 거래소에 내는지
// 제출처와 기한은 거래소보다 제한 유형에 따라 먼저 갈립니다 (리서치 5-2).

interface SituationScreenProps {
  submission: SubmissionDetails;
  onChange: (submission: SubmissionDetails) => void;
  onNext: () => void;
}

const restrictionOrder: RestrictionType[] = ["internal", "sanction", "phishing", "unknown"];
const scopeOrder: RestrictionScope[] = ["deposit", "withdraw", "account", "unknown"];

const baseDateLabels: Record<RestrictionType, string | null> = {
  internal: "자료 제출 기한 (거래소 통지에 적힌 날짜)",
  phishing: "채권소멸절차 개시 공고일",
  sanction: null,
  unknown: null,
};

const fieldStatusLabels = {
  verified: "공개 자료 확인",
  check: "확인 필요",
  caution: "주의",
} as const;

function FieldList({ fields }: { fields: ProfileField[] }) {
  return (
    <dl className="profile-fields">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>
            <span>{field.value}</span>
            <span className={`field-chip is-${field.status}`}>
              {fieldStatusLabels[field.status]}
              {field.source ? " · " : null}
              {/* 출처에 주소가 있으면 원문을 바로 열어 볼 수 있게 합니다 */}
              {field.source?.url ? (
                <a href={field.source.url} target="_blank" rel="noreferrer">
                  {field.source.label} ↗
                </a>
              ) : (
                field.source?.label
              )}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SituationScreen({ submission, onChange, onNext }: SituationScreenProps) {
  const profile = getProfile(submission.exchange);
  const group = profile ? GROUPS[profile.group] : null;
  const route = getSubmissionRoute(submission, todayInSeoul());
  const baseDateLabel = baseDateLabels[submission.restrictionType];

  const selectExchange = (exchange: ExchangeId) => onChange({ ...submission, exchange });

  return (
    <section className="screen-section" aria-labelledby="situation-title">
      <div className="section-heading compact-heading">
        <h1 id="situation-title">상황</h1>
        <p>받은 제한과 거래소를 고르면 어디에, 언제까지 낼지 먼저 정리합니다.</p>
      </div>

      <div className="situation-layout">
        <div className="situation-column">
          <section className="situation-panel" aria-labelledby="restriction-title">
            <h2 id="restriction-title">어떤 제한을 받았나요?</h2>
            <div className="choice-list" role="radiogroup" aria-labelledby="restriction-title">
              {restrictionOrder.map((type) => (
                <label key={type} className={submission.restrictionType === type ? "choice-row is-selected" : "choice-row"}>
                  <input
                    type="radio"
                    name="restriction-type"
                    value={type}
                    checked={submission.restrictionType === type}
                    onChange={() => onChange({ ...submission, restrictionType: type, baseDate: "" })}
                  />
                  <span>
                    <b>{RESTRICTION_LABELS[type]}</b>
                    <small>{RESTRICTION_DESCRIPTIONS[type]}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="situation-panel" aria-labelledby="notice-title">
            <h2 id="notice-title">통지 내용</h2>
            <div className="notice-grid">
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
                <span>통지받은 날 <small>선택</small></span>
                <input
                  type="date"
                  value={submission.noticeDate}
                  onChange={(event) => onChange({ ...submission, noticeDate: event.target.value })}
                />
              </label>
              {baseDateLabel ? (
                <label className="text-field compact-field notice-wide">
                  <span>{baseDateLabel} <small>모르면 비워 두기</small></span>
                  <input
                    type="date"
                    value={submission.baseDate}
                    onChange={(event) => onChange({ ...submission, baseDate: event.target.value })}
                  />
                </label>
              ) : null}
              <label className="text-field compact-field notice-wide submission-request-field">
                <span>거래소에서 받은 문구 <small>선택</small></span>
                <textarea
                  rows={3}
                  placeholder="통지나 요청 문구가 있다면 붙여넣으세요."
                  value={submission.requestText}
                  onChange={(event) => onChange({ ...submission, requestText: event.target.value })}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="situation-column">
          <section className="situation-panel" aria-labelledby="exchange-title">
            <h2 id="exchange-title">어느 거래소에 내나요?</h2>
            {(["kr", "intl"] as const).map((groupId) => (
              <div key={groupId} className="exchange-group">
                <span className="exchange-group-label">{GROUPS[groupId].name}</span>
                <div className="segmented-options" role="group" aria-label={GROUPS[groupId].name}>
                  {PROFILE_ORDER[groupId].map((id) => {
                    const item = PROFILES[id];
                    const selected = submission.exchange === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        className={[
                          "segment-button",
                          "exchange-button",
                          selected ? "is-selected" : "",
                          item.status === "verified" ? "" : "is-unverified",
                        ].join(" ")}
                        onClick={() => selectExchange(id)}
                      >
                        {item.status === "fallback" ? (groupId === "kr" ? "그 외 국내" : "그 외 해외") : item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="profile-legend">
              <span className="legend-solid" />공개 자료 확인 <span className="legend-dashed" />리서치 중 · 공통 기준
            </p>

            {profile && group ? (
              <div className="profile-panel">
                <div className="profile-head">
                  <b>{profile.name}</b>
                  <span className={`field-chip is-${profile.status === "verified" ? "verified" : "check"}`}>
                    {profile.status === "verified" ? "확인 완료" : profile.status === "research" ? "리서치 중" : "공통 기준만"}
                  </span>
                </div>
                <span className="profile-subtitle">{group.name} 공통</span>
                <FieldList fields={group.fields} />
                {profile.fields.length > 0 ? (
                  <>
                    <span className="profile-subtitle">{profile.name}만의 칸</span>
                    <FieldList fields={profile.fields} />
                  </>
                ) : null}
                {profile.status !== "verified" ? (
                  <p className="profile-note">
                    아직 공개 자료로 확인한 거래소별 칸이 없습니다. {group.name} 공통 기준으로 안내합니다.
                  </p>
                ) : null}
                <p className="profile-note">
                  {profile.checkedAt ? `확인일 ${profile.checkedAt} · ` : ""}비공식 정리입니다. 거래소 공식 양식이 아닙니다.
                </p>
              </div>
            ) : (
              <p className="profile-note">거래소를 고르면 제출 창구와 요청 자료를 보여줍니다. 몰라도 다음으로 넘어갈 수 있습니다.</p>
            )}
          </section>

          <dl className={`submission-route deadline-${route.deadline.status}`} aria-label="제출처와 기한">
            <div><dt>제출처</dt><dd>{route.submitTo}</dd></div>
            <div><dt>기한</dt><dd className="route-deadline">{route.deadline.text}</dd></div>
            {route.reviewPeriod ? <div><dt>심사 기간</dt><dd>{route.reviewPeriod}</dd></div> : null}
            {route.notes.map((note) => (
              <div key={note}><dt>참고</dt><dd>{note}</dd></div>
            ))}
          </dl>
        </div>
      </div>

      <div className="screen-actions screen-actions-end">
        <button className="primary-button" type="button" onClick={onNext}>
          다음 · 입금 찾기
        </button>
      </div>
    </section>
  );
}
