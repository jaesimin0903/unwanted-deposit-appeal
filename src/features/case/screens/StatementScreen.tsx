import { useEffect, useRef, useState } from "react";
import { SCENARIO_MODE, sampleNoteText } from "@/features/case/scenario";
import { answerLabel, formatKoreanDateTime, withJosa } from "@/features/case/utils";
import {
  DOCUMENT_STATUS_LABELS,
  OBJECTION_LABELS,
  REQUEST_TYPE_LABELS,
  requestTypeLabel,
  getProfile,
  todayInSeoul,
} from "@/profiles";
import { parseNotice } from "@/features/case/notice";
import { AttachmentBoard, type AttachmentState } from "@/features/case/AttachmentBoard";
import { SLOT_LABELS, attachmentSlots, filesIn } from "@/features/case/attachments";
import { appealDocuments, appealRequest, appealTitle } from "@/server/report/appeal"; // 순수 함수: 소명서와 같은 목록 · 문장을 미리 보여줍니다
import type {
  Answer,
  AppealRequestType,
  CaseAnalysis,
  ObjectionGround,
  SubmissionDetails,
  UserStatement,
} from "@/types/case";

// 내 설명은 한 번에 하나씩 묻습니다: 입금에 대해(질문 3개 + 처음 안 날) → 직접 설명 → 요청할 내용 → 같이 낼 파일
export type StatementPart = "questions" | "note" | "request" | "files";

interface StatementScreenProps {
  part: StatementPart;
  onPartChange: (part: StatementPart) => void;
  statement: UserStatement;
  analysis?: CaseAnalysis;
  submission: SubmissionDetails;
  onStatementChange: (statement: UserStatement) => void;
  onSubmissionChange: (submission: SubmissionDetails) => void;
  attachments: AttachmentState;
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

function requestLabel(submission: SubmissionDetails) {
  if (submission.restrictionType === "unknown") return "제한 내용 문의";
  if (submission.restrictionType === "phishing") return OBJECTION_LABELS[submission.objectionGround].label;
  return requestTypeLabel(submission.requestType, submission.scope).label;
}

const QUESTION_COUNT = questions.length;
// 질문에 답하면 고른 답이 눌리는 움직임을 보여 준 뒤 다음 질문으로 넘어갑니다
const ADVANCE_MS = 320;

export function StatementScreen({
  part,
  onPartChange,
  statement,
  analysis,
  submission,
  onStatementChange,
  onSubmissionChange,
  attachments,
  onEditSituation,
  onBack,
  onNext,
  loading,
  error,
}: StatementScreenProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const profile = getProfile(submission.exchange);
  const type = submission.restrictionType;
  const answeredCount = questions.filter((question) => statement[question.key] !== null).length;
  const unanswered = QUESTION_COUNT - answeredCount;
  const hadReason = questions.some((question) => statement[question.key] === "yes");
  const documents = appealDocuments({ submission, statement, profile });
  const sourceOfFunds = parseNotice(submission.requestText, todayInSeoul()).asksSourceOfFunds;
  const firstOutgoing = analysis?.evidence.find((item) => item.id === "D-first-outgoing");
  const slots = attachmentSlots({ submission, profile, asksSourceOfFunds: sourceOfFunds });
  // 자료 종류가 아닌 칸(통지 화면, 계정 화면, 그 밖의 자료)에 넣은 파일은 미리보기에 따로 적습니다
  const extraFiles = (["notice", "account", "other"] as const)
    .map((slot) => ({ slot, count: filesIn(attachments.files, slot).length }))
    .filter((item) => item.count > 0);
  const wantedTitle = [profile?.status === "verified" ? `${withJosa(profile.name, "이", "가")} 요청하는 자료` : "", sourceOfFunds ? "통지가 요구한 자금 출처 자료" : ""]
    .filter(Boolean)
    .join(" · ");

  // 순서: 받은 제한을 모르면 요청 대신 문의서 안내까지만 (파일 칸은 5단계에서 넣을 수 있음)
  const parts: { id: StatementPart; label: string }[] = [
    { id: "questions", label: "입금에 대해" },
    { id: "note", label: "직접 설명" },
    { id: "request", label: type === "unknown" ? "받은 제한" : "요청할 내용" },
    ...(type === "unknown" ? [] : [{ id: "files" as const, label: "같이 낼 파일" }]),
  ];
  const partIndex = Math.max(0, parts.findIndex((item) => item.id === part));
  const current = parts[partIndex];
  const isLastPart = partIndex === parts.length - 1;

  // 질문은 하나씩: 0~2는 예/아니요 질문, 3은 처음 알게 된 날
  const [questionIndex, setQuestionIndex] = useState(() => {
    const firstOpen = questions.findIndex((question) => statement[question.key] === null);
    return firstOpen === -1 ? QUESTION_COUNT : firstOpen;
  });
  // 질문이 바뀔 때 들어오는 방향 (다음: 오른쪽에서, 이전: 왼쪽에서)
  const [slide, setSlide] = useState<"next" | "prev">("next");
  const showQuestion = (index: number) => {
    setSlide(index >= questionIndex ? "next" : "prev");
    setQuestionIndex(index);
  };
  const advanceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // 다음 질문으로 넘어가면 키보드 · 화면 읽기 사용자도 새 질문부터 읽도록 제목으로 포커스를 옮깁니다
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const shownQuestion = useRef(questionIndex);
  useEffect(() => {
    if (shownQuestion.current === questionIndex) return;
    shownQuestion.current = questionIndex;
    questionHeadingRef.current?.focus({ preventScroll: true });
  }, [questionIndex]);

  // 순서를 옮기면 그 칸의 맨 위가 보이게 합니다 (처음 들어올 때는 화면 맨 위라 그대로)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const form = formRef.current;
    if (form && form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: "start" });
  }, [part]);

  const setAnswer = (key: QuestionKey, value: Answer) => onStatementChange({ ...statement, [key]: value });
  // 방금 누른 답만 눌리는 움직임을 줍니다 (이전 질문으로 돌아와 볼 때는 움직이지 않음)
  const [picked, setPicked] = useState<string | null>(null);
  const answerAndAdvance = (index: number, value: Answer) => {
    setAnswer(questions[index].key, value);
    setPicked(`${index}:${value}`);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      setSlide("next");
      setQuestionIndex(index + 1);
    }, ADVANCE_MS);
  };

  const goPart = (next: StatementPart, atQuestion?: number) => {
    window.clearTimeout(advanceTimer.current);
    if (next === "questions" && atQuestion !== undefined) showQuestion(atQuestion);
    onPartChange(next);
  };
  const goPrev = () => {
    if (current.id === "questions") {
      if (questionIndex > 0) showQuestion(questionIndex - 1);
      else onBack();
      return;
    }
    const previous = parts[partIndex - 1];
    goPart(previous.id, previous.id === "questions" ? QUESTION_COUNT : undefined);
  };
  const goNext = () => {
    if (current.id === "questions" && questionIndex < QUESTION_COUNT) {
      window.clearTimeout(advanceTimer.current);
      showQuestion(questionIndex + 1);
      return;
    }
    goPart(parts[partIndex + 1].id);
  };
  const nextLabel =
    current.id === "questions" && questionIndex < QUESTION_COUNT
      ? statement[questions[questionIndex].key] === null
        ? "건너뛰기"
        : "다음 질문"
      : isLastPart
        ? ""
        : `다음 · ${parts[partIndex + 1].label}`;

  const partStatus = (id: StatementPart) => {
    if (id === "questions") return `${answeredCount}/${QUESTION_COUNT} 답함`;
    if (id === "note") return statement.note.trim() ? "적음" : "선택";
    if (id === "request") return type === "unknown" ? "문의서" : requestLabel(submission);
    return attachments.files.length > 0 ? `파일 ${attachments.files.length}개` : "선택";
  };

  // 시연 시나리오에서는 시작 문장 뒤에 예시 설명까지 넣습니다 (scenario.ts)
  const addStarter = (starter: string) => {
    const currentNote = statement.note.replace(/\s+$/, "");
    const sample = SCENARIO_MODE
      ? sampleNoteText(starter, {
          exchangeName: profile && profile.status !== "fallback" ? profile.name : null,
          noticeDate: submission.noticeDate,
          transfer: analysis?.transfer,
          knowsSender: statement.knowsSender,
          firstOutgoingTitle: firstOutgoing?.title ?? null,
        })
      : "";
    const note = `${currentNote ? `${currentNote}\n` : ""}${starter}: ${sample}`;
    // 예시 경위는 통지를 받고 알았다는 내용이라, 처음 알게 된 날이 비어 있으면 통지받은 날로 채웁니다
    const discoveredAt =
      SCENARIO_MODE && starter === "처음 알게 된 경위" && !statement.discoveredAt ? submission.noticeDate : statement.discoveredAt;
    onStatementChange({ ...statement, note, discoveredAt });
    requestAnimationFrame(() => {
      const field = noteRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(note.length, note.length);
    });
  };

  const question = questions[Math.min(questionIndex, QUESTION_COUNT - 1)];

  return (
    <section className="screen-section" aria-labelledby="statement-title">
      <div className="section-heading compact-heading">
        <h1 id="statement-title">내 설명</h1>
        <p>거래소 담당자가 읽을 내 쪽 이야기예요. 한 번에 하나씩 물어볼게요. 모르는 건 &ldquo;모르겠어요&rdquo;를 고르면 돼요.</p>
      </div>

      <div className="stmt-layout">
        <div className="stmt-form" ref={formRef}>
          <ol className="stmt-steps" aria-label="내 설명 순서">
            {parts.map((item, index) => (
              <li key={item.id} className={index === partIndex ? "is-current" : index < partIndex ? "is-done" : undefined}>
                <button
                  type="button"
                  aria-current={index === partIndex ? "step" : undefined}
                  onClick={() => goPart(item.id, item.id === "questions" ? 0 : undefined)}
                >
                  <span>{index + 1}</span>
                  <b>{item.label}</b>
                  <small>{partStatus(item.id)}</small>
                </button>
              </li>
            ))}
          </ol>

          {current.id === "questions" ? (
            <section className="stmt-section ask-card" aria-labelledby="ask-title">
              <div className="ask-progress" aria-hidden="true">
                <i style={{ width: `${((questionIndex + 1) / (QUESTION_COUNT + 1)) * 100}%` }} />
              </div>
              <div key={questionIndex} className={`ask-slide is-${slide}`}>
                {questionIndex < QUESTION_COUNT ? (
                  <>
                    <p className="ask-count">질문 {questionIndex + 1} / {QUESTION_COUNT}</p>
                    <h2 id="ask-title" ref={questionHeadingRef} tabIndex={-1}>
                      {question.label}
                    </h2>
                    <p className="ask-hint">{question.hint}</p>
                    {/* 질문마다 새로 그려지므로(ask-slide key), 앞 질문에서 누른 버튼의 포커스가 다음 질문에 남지 않습니다 */}
                    <div className="ask-options" role="group" aria-labelledby="ask-title">
                      {answerOptions.map((option) => {
                        const selected = statement[question.key] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={[
                              "ask-option",
                              selected ? "is-selected" : "",
                              picked === `${questionIndex}:${option.id}` ? "is-picked" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-pressed={selected}
                            onClick={() => answerAndAdvance(questionIndex, option.id)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="ask-why">블록체인 기록으로는 알 수 없는 부분이라, 고른 답이 그대로 소명서에 들어가요.</p>
                  </>
                ) : (
                  <>
                    <p className="ask-count">마지막 질문 <em>선택</em></p>
                    <h2 id="ask-title">입금을 처음 알게 된 날은 언제인가요?</h2>
                    <p className="ask-hint">
                      {analysis
                        ? `입금은 ${formatKoreanDateTime(analysis.transfer.timestamp)}에 들어왔어요. 거래소나 지갑 알림을 처음 본 날을 적어 주세요.`
                        : "거래소나 지갑 알림을 처음 본 날을 적어 주세요."}{" "}
                      모르면 비워 두고 넘어가도 돼요.
                    </p>
                    <div className="stmt-date-wrap ask-date">
                      <input
                        className="stmt-date"
                        type="date"
                        aria-labelledby="ask-title"
                        value={statement.discoveredAt}
                        onChange={(event) => onStatementChange({ ...statement, discoveredAt: event.target.value })}
                      />
                      {submission.noticeDate && statement.discoveredAt !== submission.noticeDate ? (
                        // 1단계에서 넣은 통지받은 날을 한 번에 옮깁니다
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onStatementChange({ ...statement, discoveredAt: submission.noticeDate })}
                        >
                          통지받은 날({submission.noticeDate})과 같아요
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </section>
          ) : null}

          {current.id === "note" ? (
            <section className="stmt-section" aria-labelledby="stmt-note">
              <header>
                <div>
                  <h2 id="stmt-note">더 알릴 것이 있으면 적어 주세요 <em>선택</em></h2>
                  <p>담당자가 알아야 할 사실만 적어요. 아래 버튼을 누르면 시작 문장이 들어가요. 적을 것이 없으면 넘어가도 돼요.</p>
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
              {firstOutgoing && !/입금 후 한 일:\s*\S/.test(statement.note) ? (
                // 소명서에 들어가는 "입금 후 내 지갑의 전송"을 사용자가 미리 알고 설명할 수 있게 합니다 (적고 나면 감춤)
                <p className="note-context">
                  블록체인 기록에 <b>「{firstOutgoing.title}」</b>가 나와요. 무엇이었는지 <b>입금 후 한 일</b>에 적으면 담당자가 이해하기 쉬워요.
                </p>
              ) : null}
              <textarea
                ref={noteRef}
                className="stmt-note"
                rows={5}
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
          ) : null}

          {current.id === "request" && type === "unknown" ? (
            <section className="stmt-section stmt-unknown">
              <header>
                <div>
                  <h2>받은 제한을 아직 모르시네요</h2>
                  <p>소명서 대신 거래소에 제한 유형, 범위, 필요한 자료, 기한을 묻는 문의서를 만들어요. 받은 제한을 알면 1단계에서 바꿔 주세요.</p>
                </div>
              </header>
              <button className="secondary-button" type="button" onClick={onEditSituation}>1단계 상황 고치기</button>
            </section>
          ) : null}

          {current.id === "request" && type !== "unknown" ? (
            <section className="stmt-section" aria-labelledby="stmt-request">
              <header>
                <div>
                  <h2 id="stmt-request">거래소에 무엇을 요청할까요?</h2>
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
                  블록체인 기록 확인에서 보낸 주소가 제재 목록에 있었어요. 지금은 받은 통지대로 &apos;거래소 내부 심사&apos; 소명서를 만들어요. 나중에 거래소가
                  제재를 이유로 다시 알려 오면, 1단계에서 &apos;제재에 따른 자산 동결&apos;로 바꿔 다시 만드세요.
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
          ) : null}

          {current.id === "files" ? (
            <section className="stmt-section" aria-labelledby="stmt-documents">
              <header>
                <div>
                  <h2 id="stmt-documents">같이 낼 파일을 넣어 주세요 <em>선택</em></h2>
                  <p>
                    준비한 파일을 알맞은 칸에 넣으면 바로 열어 볼 수 있어요. 소명서의 제출 자료 목록에는 파일 이름이 적혀요. 파일은 이 브라우저에만 있고 서버로
                    보내지 않아요. 새로고침하면 사라져요.
                  </p>
                </div>
              </header>
              {hadReason ? (
                <p className="stmt-tip">
                  받을 이유가 있었던 입금이라고 답했어요. 그 이유를 보여줄 자료(계약서, 대화 기록, 급여 명세 등)를 알맞은 칸에 넣어 주세요.
                </p>
              ) : null}
              <AttachmentBoard slots={slots} variant="full" wantedTitle={wantedTitle} {...attachments} />
            </section>
          ) : null}

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="screen-actions stmt-actions">
            {unanswered > 0 && (isLastPart || (current.id === "questions" && questionIndex >= QUESTION_COUNT)) ? (
              <span className="stmt-remaining">답하지 않은 질문 {unanswered}개는 &ldquo;미확인&rdquo;으로 적혀요</span>
            ) : null}
            <button className="secondary-button" type="button" onClick={goPrev}>
              이전
            </button>
            {isLastPart ? (
              <button className="primary-button" type="button" onClick={onNext} disabled={loading}>
                {loading ? "소명서 만드는 중" : "소명서 만들기"}
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={goNext}>
                {nextLabel}
              </button>
            )}
          </div>
        </div>

        <aside className="stmt-preview" aria-label="소명서 미리보기">
          <div className="preview-head">
            <span>소명서에 이렇게 들어가요</span>
            <b>{appealTitle(submission)}</b>
          </div>

          <div className="preview-progress" aria-label={`질문 ${QUESTION_COUNT}개 중 ${answeredCount}개 답함`}>
            <div>
              {questions.map((item) => (
                <i key={item.key} className={statement[item.key] !== null ? "is-done" : undefined} />
              ))}
            </div>
            <span>질문 {QUESTION_COUNT}개 중 {answeredCount}개 답함</span>
          </div>

          <div className="preview-block">
            <h3>본인 설명</h3>
            <dl>
              {questions.map((item) => (
                <div key={item.key}>
                  <dt>{item.reportLabel}</dt>
                  <dd className={statement[item.key] === null ? "is-empty" : undefined}>{answerLabel(statement[item.key])}</dd>
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
              {documents.map((document) => {
                const count = document.status === "ready" ? filesIn(attachments.files, document.id).length : 0;
                // "해당 없음"으로 표시한 요청 자료는 준비 필요 대신 그대로 보여줍니다 (소명서 본문에는 들어가지 않음)
                const skipped = document.status === "needed" && (attachments.skipped as string[]).includes(document.id);
                return (
                  <li key={document.id}>
                    <span>{document.label}</span>
                    <span className={skipped ? "document-status" : `document-status is-${document.status}`}>
                      {skipped ? "해당 없음" : DOCUMENT_STATUS_LABELS[document.status]}
                      {count > 0 ? ` · 파일 ${count}개` : ""}
                    </span>
                  </li>
                );
              })}
              {extraFiles.map((item) => (
                <li key={item.slot}>
                  <span>{SLOT_LABELS[item.slot]}</span>
                  <span className="document-status is-ready">별도 첨부 · 파일 {item.count}개</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="preview-foot">
            블록체인 기록 확인 결과 {analysis?.evidence.length ?? 0}개도 빠짐없이 들어가요. 담당자가 원본 링크로 직접 확인할 수 있어요.
          </p>
          {/* 옆에 붙어 따라오는 미리보기에서도 바로 만들 수 있게 합니다 (한 줄로 쌓이는 화면에서는 감추고 아래 버튼만 씀) */}
          {isLastPart ? null : (
            // 마지막 순서에서는 바로 아래 "소명서 만들기"와 겹쳐서 감춥니다
            <button className="primary-button preview-next" type="button" onClick={onNext} disabled={loading}>
              {loading ? "소명서 만드는 중" : "이대로 소명서 만들기"}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
