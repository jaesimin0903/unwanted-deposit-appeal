import { useRef } from "react";
import { answerLabel, formatKoreanDateTime } from "@/features/case/utils";
import {
  DOCUMENT_HINTS,
  DOCUMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  OBJECTION_LABELS,
  REQUEST_TYPE_LABELS,
  requestTypeLabel,
  getProfile,
  todayInSeoul,
} from "@/profiles";
import { parseNotice } from "@/features/case/notice";
import { appealDocuments, appealRequest, appealTitle } from "@/server/report/appeal"; // 순수 함수: 소명서와 같은 목록 · 문장을 미리 보여줍니다
import type {
  Answer,
  AppealDocumentId,
  AppealRequestType,
  CaseAnalysis,
  ObjectionGround,
  SubmissionDetails,
  UserStatement,
} from "@/types/case";

interface StatementScreenProps {
  statement: UserStatement;
  analysis?: CaseAnalysis;
  submission: SubmissionDetails;
  onStatementChange: (statement: UserStatement) => void;
  onSubmissionChange: (submission: SubmissionDetails) => void;
  onEditSituation: () => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error?: string;
}

const answerOptions: { id: Exclude<Answer, null>; label: string }[] = [
  { id: "yes", label: "예" },
  { id: "no", label: "아니요" },
  { id: "unknown", label: "모르겠어요" },
];

type QuestionKey = "requestedTransfer" | "knowsSender" | "hadPurpose";

// 소명서의 "본인 설명" 항목과 같은 순서 · 같은 이름 (ReportScreen)
const questions: { key: QuestionKey; label: string; reportLabel: string; hint: string }[] = [
  {
    key: "requestedTransfer",
    label: "이 입금을 요청하셨나요?",
    reportLabel: "입금을 요청했나",
    hint: "누군가에게 보내 달라고 했거나, 받기로 한 돈이었나요?",
  },
  {
    key: "knowsSender",
    label: "보낸 사람을 알고 계신가요?",
    reportLabel: "보낸 사람을 아나",
    hint: "보낸 주소의 주인이 누구인지 알고 있나요?",
  },
  {
    key: "hadPurpose",
    label: "이 입금과 관련된 거래 목적이 있었나요?",
    reportLabel: "거래 목적이 있었나",
    hint: "물건값, 급여, 빌려준 돈처럼 이 돈을 받을 이유가 있었나요?",
  },
];

const noteStarters = ["처음 알게 된 경위", "보낸 사람에 대해 아는 것", "입금 후 한 일"];

// 통지가 "자금 출처" 자료를 요구할 때 그 예가 되는 자료 (업비트 개인정보처리방침 "자금출처확인": 금융기관 · 타 거래소 거래내역, 원화로 산 잔액이면 이 거래소의 매수 내역)
const SOURCE_OF_FUNDS_DOCUMENTS: AppealDocumentId[] = ["bankRecords", "otherExchangeRecords", "exchangeRecords"];

// 사용자가 "별도 첨부"로 표시할 수 있는 자료 (거래 해시와 입금 경위는 자동으로 들어감)
const optionalDocuments: AppealDocumentId[] = ["bankRecords", "otherExchangeRecords", "exchangeRecords", "counterpartyRecords"];

function requestLabel(submission: SubmissionDetails) {
  if (submission.restrictionType === "unknown") return "제한 내용 문의";
  if (submission.restrictionType === "phishing") return OBJECTION_LABELS[submission.objectionGround].label;
  return requestTypeLabel(submission.requestType, submission.scope).label;
}

function AnswerRow({
  label,
  hint,
  name,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  name: string;
  value: Answer;
  onChange: (value: Answer) => void;
}) {
  const labelId = `${name}-label`;
  return (
    <div className="answer-row">
      <div className="answer-text">
        <b id={labelId}>{label}</b>
        <small>{hint}</small>
      </div>
      <div className="answer-segment" role="radiogroup" aria-labelledby={labelId}>
        {answerOptions.map((option) => (
          <label key={option.id} className={value === option.id ? "is-selected" : undefined}>
            <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function StatementScreen({
  statement,
  analysis,
  submission,
  onStatementChange,
  onSubmissionChange,
  onEditSituation,
  onBack,
  onNext,
  loading,
  error,
}: StatementScreenProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const profile = getProfile(submission.exchange);
  const type = submission.restrictionType;
  const answeredCount = questions.filter((question) => statement[question.key] !== null).length;
  const unanswered = questions.length - answeredCount;
  const hadReason = questions.some((question) => statement[question.key] === "yes");
  const documents = appealDocuments({ submission, statement, profile });
  const sourceOfFunds = parseNotice(submission.requestText, todayInSeoul()).asksSourceOfFunds;
  const firstOutgoing = analysis?.evidence.find((item) => item.id === "D-first-outgoing");

  const setAnswer = (key: QuestionKey, value: Answer) => onStatementChange({ ...statement, [key]: value });

  const addStarter = (starter: string) => {
    const current = statement.note.replace(/\s+$/, "");
    const note = `${current ? `${current}\n` : ""}${starter}: `;
    onStatementChange({ ...statement, note });
    requestAnimationFrame(() => {
      const field = noteRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(note.length, note.length);
    });
  };

  const toggleDocument = (id: AppealDocumentId) => {
    const has = submission.availableDocuments.includes(id);
    onSubmissionChange({
      ...submission,
      availableDocuments: has
        ? submission.availableDocuments.filter((item) => item !== id)
        : [...submission.availableDocuments, id],
    });
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    }));
    onStatementChange({
      ...statement,
      attachments: [...statement.attachments, ...next.filter((item) => !statement.attachments.some((current) => current.id === item.id))],
    });
  };

  const removeAttachment = (id: string) =>
    onStatementChange({ ...statement, attachments: statement.attachments.filter((attachment) => attachment.id !== id) });

  return (
    <section className="screen-section" aria-labelledby="statement-title">
      <div className="section-heading compact-heading">
        <h1 id="statement-title">내 설명</h1>
        <p>거래소 담당자가 읽을 내 쪽 이야기예요. 모르는 건 &ldquo;모르겠어요&rdquo;를 고르면 되고, 답하지 않은 칸은 &ldquo;미확인&rdquo;으로 적혀요.</p>
      </div>

      <div className="stmt-layout">
        <div className="stmt-form">
          <section className="stmt-section" aria-labelledby="stmt-answers">
            <header>
              <span className="stmt-step">1</span>
              <div>
                <h2 id="stmt-answers">입금에 대해 답해 주세요</h2>
                <p>블록체인 기록(온체인)으로는 알 수 없는 부분이라, 본인의 답이 그대로 소명서에 들어가요.</p>
              </div>
            </header>
            {questions.map((question) => (
              <AnswerRow
                key={question.key}
                label={question.label}
                hint={question.hint}
                name={question.key}
                value={statement[question.key]}
                onChange={(value) => setAnswer(question.key, value)}
              />
            ))}
            <div className="answer-row">
              <div className="answer-text">
                <b>입금을 처음 알게 된 날 <em>선택</em></b>
                <small>
                  {analysis
                    ? `입금은 ${formatKoreanDateTime(analysis.transfer.timestamp)}에 들어왔어요. 알림을 처음 본 날을 적어 주세요.`
                    : "거래소나 지갑 알림을 처음 본 날을 적어 주세요."}
                </small>
              </div>
              <div className="stmt-date-wrap">
                <input
                  className="stmt-date"
                  type="date"
                  aria-label="입금을 처음 알게 된 날"
                  value={statement.discoveredAt}
                  onChange={(event) => onStatementChange({ ...statement, discoveredAt: event.target.value })}
                />
                {submission.noticeDate && statement.discoveredAt !== submission.noticeDate ? (
                  // 1단계에서 넣은 통지받은 날을 한 번에 옮깁니다
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onStatementChange({ ...statement, discoveredAt: submission.noticeDate })}
                  >
                    통지받은 날({submission.noticeDate})과 같음
                  </button>
                ) : null}
              </div>
            </div>
            {hadReason ? (
              <p className="stmt-tip">
                받을 이유가 있었던 입금이라면 그 이유를 보여줄 자료(계약서, 대화 기록, 급여 명세 등)를 아래 &ldquo;준비한 자료&rdquo;에 표시해 주세요.
              </p>
            ) : null}
          </section>

          <section className="stmt-section" aria-labelledby="stmt-note">
            <header>
              <span className="stmt-step">2</span>
              <div>
                <h2 id="stmt-note">직접 설명하기 <em>선택</em></h2>
                <p>담당자가 알아야 할 사실만 적어 주세요. 아래 버튼으로 시작 문장을 넣을 수 있어요.</p>
              </div>
            </header>
            <div className="note-starters">
              {noteStarters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => addStarter(starter)}
                  disabled={statement.note.includes(`${starter}:`)}
                >
                  + {starter}
                </button>
              ))}
            </div>
            {firstOutgoing ? (
              // 소명서에 들어가는 "입금 후 내 지갑의 전송"을 사용자가 미리 알고 설명할 수 있게 합니다
              <p className="note-context">
                온체인 조사 결과에 <b>「{firstOutgoing.title}」</b>가 들어가요. 무엇이었는지 <b>입금 후 한 일</b>에 적으면 담당자가 이해하기 쉬워요.
              </p>
            ) : null}
            <textarea
              ref={noteRef}
              className="stmt-note"
              rows={4}
              aria-labelledby="stmt-note"
              placeholder="예) 10월 29일 아침 거래소 알림을 보고 처음 알았습니다. 보낸 주소는 모르는 주소입니다."
              value={statement.note}
              onChange={(event) => onStatementChange({ ...statement, note: event.target.value })}
            />
            <div className="note-foot">
              <span>확인한 사실만 적고, 개인 키 · 시드 문구 · 비밀번호는 절대 적지 마세요.</span>
              <span>{statement.note.length}자</span>
            </div>
          </section>

          {type === "unknown" ? (
            <section className="stmt-section stmt-unknown">
              <header>
                <span className="stmt-step">3</span>
                <div>
                  <h2>받은 제한을 아직 모르시네요</h2>
                  <p>소명서 대신 거래소에 제한 유형, 범위, 필요한 자료, 기한을 묻는 문의서를 만들어요. 받은 제한을 알면 1단계에서 바꿔 주세요.</p>
                </div>
              </header>
              <button className="secondary-button" type="button" onClick={onEditSituation}>1단계 상황 고치기</button>
            </section>
          ) : (
            <>
              <section className="stmt-section" aria-labelledby="stmt-request">
                <header>
                  <span className="stmt-step">3</span>
                  <div>
                    <h2 id="stmt-request">무엇을 요청할까요?</h2>
                    <p>{type === "phishing" ? "지급정지에 이의를 제기하는 이유를 골라 주세요." : "소명서 마지막의 요청 문장이 이 선택에 따라 바뀌어요."}</p>
                  </div>
                </header>
                <div className="choice-list">
                  {type === "phishing"
                    ? (Object.keys(OBJECTION_LABELS) as ObjectionGround[]).map((ground) => (
                        <label key={ground} className={submission.objectionGround === ground ? "choice-row is-selected" : "choice-row"}>
                          <input
                            type="radio"
                            name="objection-ground"
                            checked={submission.objectionGround === ground}
                            onChange={() => onSubmissionChange({ ...submission, objectionGround: ground })}
                          />
                          <span>
                            <b>{OBJECTION_LABELS[ground].label}</b>
                            <small>{OBJECTION_LABELS[ground].description}</small>
                          </span>
                        </label>
                      ))
                    : (Object.keys(REQUEST_TYPE_LABELS) as AppealRequestType[]).map((requestType) => (
                        <label key={requestType} className={submission.requestType === requestType ? "choice-row is-selected" : "choice-row"}>
                          <input
                            type="radio"
                            name="request-type"
                            checked={submission.requestType === requestType}
                            onChange={() => onSubmissionChange({ ...submission, requestType })}
                          />
                          <span>
                            <b>{requestTypeLabel(requestType, submission.scope).label}</b>
                            <small>{requestTypeLabel(requestType, submission.scope).description}</small>
                          </span>
                        </label>
                      ))}
                </div>
                {type !== "phishing" && submission.requestType === "fund" && analysis?.sanctions.senderMatched ? (
                  <p className="appeal-warning">
                    보낸 주소가 조회한 제재 목록과 일치합니다. 이런 자금은 거래소 판단만으로 풀기 어려워서, 대부분 {requestTypeLabel("account", submission.scope).label}가 현실적입니다.
                  </p>
                ) : null}
                {analysis?.sanctions.senderMatched && type === "internal" ? (
                  <p className="request-note">
                    온체인 조사에서 보낸 주소가 제재 목록에 있었어요. 받은 제한은 통지 문구를 기준으로 고른 것이에요. 거래소가 제재를 이유로 다시 통지하면 1단계에서
                    &apos;제재에 따른 자산 동결&apos;로 바꿀 수 있어요.
                  </p>
                ) : null}
                {analysis ? (
                  // 고른 요청이 소명서에 어떤 문장으로 들어가는지 미리 보여줍니다 (예: "보류에 이의가 없습니다")
                  <blockquote className="request-preview">
                    <span>소명서에 들어갈 문장</span>
                    {appealRequest(submission, {
                      amountText: `${analysis.transfer.displayValue} ${analysis.transfer.asset}`,
                      senderMatchedSanctions: analysis.sanctions.senderMatched,
                    })}
                  </blockquote>
                ) : null}
              </section>

              <section className="stmt-section" aria-labelledby="stmt-documents">
                <header>
                  <span className="stmt-step">4</span>
                  <div>
                    <h2 id="stmt-documents">준비한 자료</h2>
                    <p>가지고 있는 자료에 표시하면 소명서의 제출 자료 목록에 &ldquo;별도 첨부&rdquo;로 들어가요. 거래소에 낼 때 파일을 함께 올리세요.</p>
                  </div>
                </header>
                <div className="doc-checks">
                  {optionalDocuments.map((id) => {
                    const requested = profile?.status === "verified" && profile.requestedDocuments.includes(id);
                    const checked = submission.availableDocuments.includes(id);
                    return (
                      <label key={id} className={checked ? "doc-check is-checked" : "doc-check"}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDocument(id)} />
                        <span>
                          <b>{DOCUMENT_LABELS[id]}</b>
                          <small>{DOCUMENT_HINTS[id]}</small>
                        </span>
                        <span className="doc-chips">
                          {sourceOfFunds && SOURCE_OF_FUNDS_DOCUMENTS.includes(id) ? (
                            <span className="field-chip">자금 출처 자료</span>
                          ) : null}
                          {requested ? <span className="field-chip is-verified">{profile.name} 요청 항목</span> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="file-box">
                  <div>
                    <b>파일 붙이기 <em>선택 · PDF, JPG, PNG</em></b>
                    <small>파일 내용은 서버로 보내지 않아요. 소명서에는 파일 이름만 적히니, 거래소에 낼 때 파일을 함께 첨부하세요.</small>
                  </div>
                  <label className="attachment-button">
                    파일 선택
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(event) => {
                        addAttachments(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {statement.attachments.length > 0 ? (
                    <ul className="attachment-list">
                      {statement.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <span>
                            <b>{attachment.name}</b>
                            <small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small>
                          </span>
                          <button type="button" onClick={() => removeAttachment(attachment.id)}>빼기</button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="stmt-preview" aria-label="소명서 미리보기">
          <div className="preview-head">
            <span>소명서에 이렇게 들어가요</span>
            <b>{appealTitle(submission)}</b>
          </div>

          <div className="preview-progress" aria-label={`질문 ${questions.length}개 중 ${answeredCount}개 답함`}>
            <div>
              {questions.map((question) => (
                <i key={question.key} className={statement[question.key] !== null ? "is-done" : undefined} />
              ))}
            </div>
            <span>질문 {questions.length}개 중 {answeredCount}개 답함</span>
          </div>

          <div className="preview-block">
            <h3>본인 설명</h3>
            <dl>
              {questions.map((question) => (
                <div key={question.key}>
                  <dt>{question.reportLabel}</dt>
                  <dd className={statement[question.key] === null ? "is-empty" : undefined}>{answerLabel(statement[question.key])}</dd>
                </div>
              ))}
              <div>
                <dt>처음 알게 된 날</dt>
                <dd className={statement.discoveredAt ? undefined : "is-empty"}>{statement.discoveredAt || "미확인"}</dd>
              </div>
              {firstOutgoing ? (
                <div>
                  <dt>입금 후 전송 설명</dt>
                  <dd className={statement.note.includes("입금 후") ? undefined : "is-empty"}>
                    {statement.note.includes("입금 후") ? "적음" : "미작성 (선택)"}
                  </dd>
                </div>
              ) : null}
            </dl>
            {statement.note.trim() ? <p className="preview-note">{statement.note.trim()}</p> : null}
          </div>

          <div className="preview-block">
            <h3>요청 사항</h3>
            <p>{requestLabel(submission)}</p>
          </div>

          <div className="preview-block">
            <h3>제출 자료</h3>
            <ul className="report-documents">
              {documents.map((document) => (
                <li key={document.id}>
                  <span>{document.label}</span>
                  <span className={`document-status is-${document.status}`}>{DOCUMENT_STATUS_LABELS[document.status]}</span>
                </li>
              ))}
              {statement.attachments.length > 0 ? (
                <li>
                  <span>붙인 파일 {statement.attachments.length}개</span>
                  <span className="document-status is-ready">파일 이름만</span>
                </li>
              ) : null}
            </ul>
          </div>

          <p className="preview-foot">
            온체인 조사 결과 {analysis?.evidence.length ?? 0}개도 빠짐없이 들어가요. 담당자가 원본 링크로 직접 확인할 수 있어요.
          </p>
        </aside>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="screen-actions">
        {unanswered > 0 ? <span className="stmt-remaining">답하지 않은 질문 {unanswered}개는 &ldquo;미확인&rdquo;으로 적혀요</span> : null}
        <button className="secondary-button" type="button" onClick={onBack}>이전</button>
        <button className="primary-button" type="button" onClick={onNext} disabled={loading}>
          {loading ? "소명서 만드는 중" : "소명서 만들기"}
        </button>
      </div>
    </section>
  );
}
