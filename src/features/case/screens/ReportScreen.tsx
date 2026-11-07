import { useRef, useState } from "react";
import { AddressText } from "@/features/case/AddressText";
import { parseNotice } from "@/features/case/notice";
import { SourceLinks } from "@/features/case/SourceLinks";
import { RESTRICTION_LABELS, SCOPE_LABELS, exchangeLabel, todayInSeoul } from "@/profiles";
import { SCOPE } from "@/server/constants";
import {
  answerLabel,
  categoryLabels,
  daysLeftLabel,
  formatKoreanDateTime,
  providerLabels,
} from "@/features/case/utils";
import type {
  CaseAnalysis,
  CaseReport,
  DocumentStatus,
  EvidenceCategory,
  ReportDocument,
  SubmissionDetails,
  UserStatement,
} from "@/types/case";

// 신청인 정보는 소명서에만 적고 서버로 보내지 않습니다 (브라우저 화면 상태로만 둠)
interface Applicant {
  name: string;
  account: string;
  contact: string;
}

// 소명서 본문에는 실제로 함께 내는 자료만 적습니다. 아직 준비하지 않은 자료는 오른쪽 "같이 낼 자료"에서 알려 줍니다.
const PAPER_DOCUMENT_STATUS: Record<Exclude<DocumentStatus, "needed">, string> = {
  onchain: "이 문서에 포함 (온체인 기록)",
  statement: "이 문서에 포함 (본인 설명)",
  ready: "별도 첨부",
};

function paperDocuments(report: CaseReport) {
  return report.documents.filter(
    (document): document is ReportDocument & { status: Exclude<DocumentStatus, "needed"> } => document.status !== "needed",
  );
}

// 소명서 안에서 쓰는 구분 이름. "확인할 수 없음"은 자백처럼 읽히지 않게 풀어 씁니다.
const PAPER_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  verified: categoryLabels.verified,
  derived: "기록을 세고 비교한 결과",
  unverifiable: "기록만으로는 확인할 수 없는 것",
};

const blank = (value: string) => value.trim() || "________________";

// 소명서 안의 날짜는 입금 시각과 같은 "2026. 11. 05." 꼴로 씁니다
const dotDate = (ymd: string) => ymd.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3.");

// 요약 아래에 붙는 본인 설명 한 문장. 온체인 기록과 섞지 않고 따로 둡니다.
function statementSummary(statement: UserStatement) {
  return `본인은 입금을 요청했는지에 '${answerLabel(statement.requestedTransfer)}', 보낸 사람을 아는지에 '${answerLabel(statement.knowsSender)}', 거래 목적이 있었는지에 '${answerLabel(statement.hadPurpose)}'라고 답했습니다 (본인 설명, 온체인 기록으로 확인한 사실 아님).`;
}

interface ReportScreenProps {
  submission: SubmissionDetails;
  analysis?: CaseAnalysis;
  statement: UserStatement;
  report?: CaseReport;
  onBack: () => void;
  onRestart: () => void;
}

// "제출 문안 복사"용 글자 버전. 화면의 소명서와 같은 순서로 씁니다.
function reportText(
  report: CaseReport,
  analysis: CaseAnalysis,
  statement: UserStatement,
  submission: SubmissionDetails,
  applicant: Applicant,
) {
  const lines = [
    report.title,
    `${RESTRICTION_LABELS[submission.restrictionType]} · ${SCOPE_LABELS[submission.scope]}`,
    `신청인: ${blank(applicant.name)} · 계정: ${blank(applicant.account)} · 연락처: ${blank(applicant.contact)}`,
    `제출처: ${report.route.submitTo}`,
    `기한: ${report.route.deadline.text}`,
    `대상 지갑: ${analysis.walletAddress}`,
    `문제 거래: ${analysis.transfer.txHash}`,
    "",
    "요약",
    report.summary,
    statementSummary(statement),
  ];
  for (const category of ["verified", "derived", "unverifiable"] as const) {
    const items = analysis.evidence.filter((item) => item.category === category);
    if (items.length === 0) continue;
    lines.push("", PAPER_CATEGORY_LABELS[category]);
    for (const item of items) {
      const link = item.sources.find((source) => source.url)?.url;
      lines.push(`- ${item.title}. ${item.description}${link ? ` (${link})` : ""}`);
    }
  }
  lines.push(
    "",
    "본인 설명 (온체인 기록으로 확인한 사실이 아님)",
    `- 입금을 요청했나: ${answerLabel(statement.requestedTransfer)}`,
    `- 보낸 사람을 아나: ${answerLabel(statement.knowsSender)}`,
    `- 거래 목적이 있었나: ${answerLabel(statement.hadPurpose)}`,
    `- 처음 알게 된 날: ${statement.discoveredAt || "미확인"}`,
  );
  if (statement.note.trim()) lines.push(`- ${statement.note.trim()}`);
  lines.push("", "제출 자료");
  for (const document of paperDocuments(report)) {
    lines.push(`- ${document.label}: ${PAPER_DOCUMENT_STATUS[document.status]}`);
  }
  lines.push("", "요청 사항", report.request);
  return lines.join("\n");
}

function EvidenceSection({ analysis, category }: { analysis: CaseAnalysis; category: EvidenceCategory }) {
  const items = analysis.evidence.filter((item) => item.category === category);
  if (items.length === 0) return null;

  return (
    <section className={`report-copy report-${category}`}>
      <h3>{PAPER_CATEGORY_LABELS[category]}</h3>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <b>
              <AddressText text={item.title} />
            </b>
            <span>
              <AddressText text={item.description} />
            </span>
            <SourceLinks sources={item.sources} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReportScreen({ submission, analysis, statement, report, onBack, onRestart }: ReportScreenProps) {
  const [copyState, setCopyState] = useState<string>();
  const [applicant, setApplicant] = useState<Applicant>({ name: "", account: "", contact: "" });
  const [skipped, setSkipped] = useState<string[]>([]); // "해당 없음"으로 끈 준비 알림
  const applicantRef = useRef<HTMLFieldSetElement>(null);
  if (!analysis || !report) return null;
  const today = todayInSeoul();
  const daysLeft = daysLeftLabel(report.route.deadline.date, today);
  // 통지가 자금 출처 자료를 요구했으면, 이 도구가 만들지 않는 그 자료를 "같이 낼 자료" 맨 위에 둡니다
  const asksSourceOfFunds = parseNotice(submission.requestText, today).asksSourceOfFunds;
  const extraDocuments = asksSourceOfFunds
    ? report.additionalDocuments.filter((document) => !document.startsWith("자금 출처를 추가로 요구받은 경우"))
    : report.additionalDocuments;
  const { transfer, scope, walletAddress } = analysis;
  const hasExchange = submission.exchange !== "unspecified";
  // 소명서 제출 자료 중 아직 준비하지 않은 것 (같이 낼 자료 단계에서 먼저 보여줍니다)
  // 입금 경위 설명은 소명서의 핵심이라 "해당 없음"으로 끌 수 없고, 내용 수정에서 답하도록 안내합니다
  const pendingDocuments = report
    ? report.documents.filter((document) => document.status === "needed" && !skipped.includes(document.label))
    : [];
  // 본문을 고쳐야 하는 것(입금 경위)은 저장 전 확인으로, 함께 첨부할 자료만 "같이 낼 자료"로
  const missingDeposit = pendingDocuments.some((document) => document.id === "depositReason");
  const attachDocuments = pendingDocuments.filter((document) => document.id !== "depositReason");
  // 자금 출처 자료로 쓸 수 있는 것을 하나라도 준비했으면 경고 대신 안내로
  const sourceReady = report
    ? report.documents.some((document) => document.status === "ready" && ["bankRecords", "otherExchangeRecords", "exchangeRecords"].includes(document.id))
    : false;
  const readyDocuments = report ? report.documents.filter((document) => document.status === "ready").map((document) => document.label) : [];
  const filledApplicant = [applicant.name, applicant.account, applicant.contact].filter((value) => value.trim()).length;
  // 통지 문구가 있으면 "통지에 사유가 없으면 먼저 요청" 안내는 이 화면에서 뺍니다
  const sideNotes = report
    ? report.route.notes.filter((note) => !(submission.requestText.trim() && note.startsWith("국내 거래소는 입출금을 막을 때 사유를")))
    : [];

  // 신청인 칸이 비어 있으면 그 칸으로 데려가서 한 번 묻습니다 (빈칸은 밑줄로 남아 손으로 적을 수 있습니다)
  const confirmApplicant = (action: string) => {
    if (filledApplicant === 3) return true;
    const empty = applicantRef.current?.querySelector<HTMLInputElement>("input:placeholder-shown, input[value='']");
    empty?.scrollIntoView({ block: "center" });
    empty?.focus();
    return window.confirm(`신청인 정보 ${3 - filledApplicant}칸이 비어 있어요. 빈칸을 밑줄로 남긴 채 ${action}할까요?`);
  };
  const savePdf = () => {
    if (confirmApplicant("저장")) window.print();
  };
  // 입금 후 내 지갑의 전송이 소명서에 들어가는데 그에 대한 설명이 없으면 알려 줍니다
  const firstOutgoing = analysis?.evidence.find((item) => item.id === "D-first-outgoing");
  const outgoingUnexplained = Boolean(firstOutgoing) && !statement.note.includes("입금 후");

  const copyText = async () => {
    if (!confirmApplicant("복사")) return;
    try {
      await navigator.clipboard.writeText(reportText(report, analysis, statement, submission, applicant));
      setCopyState("소명서 전체를 복사했습니다.");
    } catch {
      setCopyState("이 브라우저에서는 복사가 막혀 있습니다. PDF로 저장해 주세요.");
    }
  };

  return (
    <section className="screen-section report-screen" aria-labelledby="report-title">
      <div className="section-heading compact-heading report-page-heading">
        <div>
          <h1 id="report-title">소명서</h1>
          <p>신청인 칸을 채우고 내용을 확인한 뒤, 오른쪽 순서대로 내세요.</p>
        </div>
      </div>

      <div className="report-layout">
        <article className="report-paper">
          <fieldset className="applicant-fields" ref={applicantRef}>
            <legend>신청인 정보 · 소명서에만 적히고 서버로 보내지 않아요</legend>
            <label>
              <span>이름</span>
              <input value={applicant.name} onChange={(event) => setApplicant({ ...applicant, name: event.target.value })} autoComplete="off" placeholder="예) 홍길동" />
            </label>
            <label>
              <span>{hasExchange ? `${exchangeLabel(submission.exchange)} 계정 (이메일 · 아이디)` : "거래소 계정 (이메일 · 아이디)"}</span>
              <input value={applicant.account} onChange={(event) => setApplicant({ ...applicant, account: event.target.value })} autoComplete="off" placeholder="가입한 이메일 또는 아이디" />
            </label>
            <label>
              <span>연락처</span>
              <input value={applicant.contact} onChange={(event) => setApplicant({ ...applicant, contact: event.target.value })} autoComplete="off" placeholder="휴대전화 번호" />
            </label>
          </fieldset>

          <header>
            <div>
              <p>{RESTRICTION_LABELS[submission.restrictionType]} · {SCOPE_LABELS[submission.scope]}</p>
              <h2>{report.title}</h2>
            </div>
            <span>작성일 {dotDate(report.generatedAt.slice(0, 10))}</span>
          </header>

          <dl className="report-metadata">
            <div><dt>신청인</dt><dd>{blank(applicant.name)}</dd></div>
            <div><dt>계정</dt><dd>{blank(applicant.account)}</dd></div>
            <div><dt>연락처</dt><dd>{blank(applicant.contact)}</dd></div>
            <div><dt>제출 대상</dt><dd>{hasExchange ? exchangeLabel(submission.exchange) : "미지정"}</dd></div>
            <div className="is-wide"><dt>대상 지갑</dt><dd>{walletAddress}</dd></div>
            <div className="is-wide"><dt>문제 거래 번호 (TxID)</dt><dd>{transfer.txHash}</dd></div>
            <div><dt>입금 금액</dt><dd>{transfer.displayValue} {transfer.asset}</dd></div>
            <div><dt>입금 시각</dt><dd>{formatKoreanDateTime(transfer.timestamp)}</dd></div>
            {submission.noticeDate ? (
              <div><dt>통지일</dt><dd>{dotDate(submission.noticeDate)}</dd></div>
            ) : null}
          </dl>

          <section className="report-copy">
            <h3>요약</h3>
            <p>{report.summary}</p>
            <p className="summary-statement">{statementSummary(statement)}</p>
          </section>

          {submission.requestText.trim() ? (
            <section className="report-copy request-source">
              <h3>거래소 요청 내용</h3>
              <p>{submission.requestText}</p>
            </section>
          ) : null}

          <EvidenceSection analysis={analysis} category="verified" />
          <EvidenceSection analysis={analysis} category="derived" />

          <section className="report-copy statement-box">
            <h3>본인 설명</h3>
            <p className="statement-caption">아래는 본인이 직접 답한 내용이며, 온체인 기록으로 확인한 사실이 아닙니다.</p>
            <dl>
              <div><dt>입금을 요청했나</dt><dd>{answerLabel(statement.requestedTransfer)}</dd></div>
              <div><dt>보낸 사람을 아나</dt><dd>{answerLabel(statement.knowsSender)}</dd></div>
              <div><dt>거래 목적이 있었나</dt><dd>{answerLabel(statement.hadPurpose)}</dd></div>
              <div><dt>처음 알게 된 날</dt><dd>{statement.discoveredAt || "미확인"}</dd></div>
            </dl>
            {statement.note ? <p>{statement.note}</p> : null}
            {statement.attachments.length > 0 ? (
              <div className="report-attachments">
                <b>첨부 자료</b>
                <ul>
                  {statement.attachments.map((attachment) => (
                    <li key={attachment.id}>{attachment.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <EvidenceSection analysis={analysis} category="unverifiable" />

          <section className="report-copy">
            <h3>조사 범위</h3>
            <dl className="scope-box report-scope">
              <div><dt>비슷한 금액 조사</dt><dd>{scope.windowLabel} ({formatKoreanDateTime(scope.windowStart)} ~ {formatKoreanDateTime(scope.windowEnd)})</dd></div>
              <div><dt>이전 거래 조사</dt><dd>입금 전 기록 전체 (최대 {scope.maxTransfers.toLocaleString("en-US")}건)</dd></div>
              <div><dt>입금 후 전송 조사</dt><dd>입금 후 {SCOPE.afterDepositDays}일</dd></div>
              <div>
                <dt>조회 건수</dt>
                <dd>
                  {scope.fetchedTransfers.toLocaleString("en-US")}건 (최대 {scope.maxTransfers.toLocaleString("en-US")}건까지 조회)
                  {scope.complete ? "" : " · 최대치에 걸려 일부만 조회"}
                </dd>
              </div>
              <div><dt>제재 목록</dt><dd>{analysis.sanctions.listName} ({analysis.sanctions.listUpdatedAt} 기준)</dd></div>
              <div><dt>조회 실패</dt><dd>{scope.failures.length === 0 ? "없음" : scope.failures.join(", ")}</dd></div>
            </dl>
          </section>

          <section className="report-copy">
            <h3>제출 자료</h3>
            <ul className="report-documents">
              {paperDocuments(report).map((document) => (
                <li key={document.id}>
                  <span>{document.label}</span>
                  <span className={`document-status is-${document.status}`}>{PAPER_DOCUMENT_STATUS[document.status]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="report-copy report-request">
            <h3>요청 사항</h3>
            <p>{report.request}</p>
          </section>

          <footer>
            <span>데이터: {providerLabels[scope.provider]} · {formatKoreanDateTime(scope.fetchedAt)} 조회</span>
            <span>문서 번호 {analysis.caseId} · 분석 버전 {report.analysisVersion} · 생성 {formatKoreanDateTime(report.generatedAt)}</span>
          </footer>
        </article>

        <aside className="submission-panel" aria-labelledby="submit-title">
          <h2 id="submit-title">이렇게 내세요</h2>
          <ol className="submit-steps">
            <li>
              <b>신청인 정보 채우기</b>
              <p className={filledApplicant < 3 ? "submit-pending" : "submit-done"}>
                {filledApplicant < 3 ? `왼쪽 위 칸 3개 중 ${filledApplicant}개 채움` : "3개 모두 채움"}
              </p>
            </li>
            {missingDeposit || outgoingUnexplained ? (
              <li>
                <b>저장 전 살펴보기</b>
                <p>
                  {missingDeposit
                    ? "입금 경위 질문에 답하지 않으면 소명서에 \"미확인\"으로 적혀요."
                    : "선택이에요. 아래 기록을 설명하면 담당자가 이해하기 쉬워요. 비워 두면 기록만 들어가요."}
                </p>
                <ul className="submit-pending-list">
                  {missingDeposit ? (
                    <li>
                      <span>입금 경위 설명이 없어요 (질문 답이 &quot;미확인&quot;으로 적혀요)</span>
                      <button type="button" className="text-button" onClick={onBack}>
                        내용 수정에서 답하기
                      </button>
                    </li>
                  ) : null}
                  {outgoingUnexplained && firstOutgoing ? (
                    <li className="is-optional">
                      <span>
                        기록 「<AddressText text={firstOutgoing.title} />」에 대한 본인 설명이 없어요
                      </span>
                      <button type="button" className="text-button" onClick={onBack}>
                        내용 수정에서 적기
                      </button>
                    </li>
                  ) : null}
                </ul>
              </li>
            ) : null}
            <li>
              <b>소명서 저장</b>
              <p>1:1 문의 본문에는 문안을 붙여넣고, PDF는 첨부 파일로 올리세요.</p>
              <div className="submit-buttons">
                <button className="primary-button" type="button" onClick={savePdf}>
                  PDF로 저장
                </button>
                <button className="secondary-button" type="button" onClick={copyText}>
                  1:1 문의용 글 복사
                </button>
              </div>
              {copyState ? <p className="copy-state" role="status">{copyState}</p> : null}
            </li>
            <li>
              <b>같이 낼 자료</b>
              {asksSourceOfFunds ? (
                <p className={sourceReady ? "submit-info" : "submit-needed"}>
                  통지가 요구한 <b>자금 출처 자료</b>(원화 입금 · 매수 내역, 급여 · 이체 내역 등)는 이 도구가 만들지 않아요.{" "}
                  {sourceReady ? "준비한 자료를 첨부하고, 더 필요한 것이 있으면 같이 내세요." : "따로 준비해 같이 내세요."}
                </p>
              ) : null}
              {attachDocuments.length > 0 ? (
                <ul className="submit-pending-list" aria-label="아직 준비 안 된 자료">
                  {attachDocuments.map((document) => (
                    <li key={document.id}>
                      <span>아직 준비 안 됨 · {document.label}</span>
                      <button type="button" className="text-button" onClick={() => setSkipped([...skipped, document.label])}>
                        해당 없음
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {readyDocuments.length > 0 ? <p>별도 첨부: {readyDocuments.join(", ")}</p> : null}
              <ul className="submit-list">
                {extraDocuments.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </li>
            <li className={`deadline-${report.route.deadline.status}`}>
              <b>{hasExchange ? `${exchangeLabel(submission.exchange)}에 제출` : "제출"}</b>
              <p>{report.route.submitTo}</p>
              <p>
                기한 <span className="route-deadline">{report.route.deadline.text}</span>
                {daysLeft ? <span className="days-left">{daysLeft}</span> : null}
              </p>
              {report.route.reviewPeriod ? <p>심사 기간 {report.route.reviewPeriod}</p> : null}
            </li>
          </ol>
          {sideNotes.length > 0 ? (
            <ul className="submit-notes">
              {sideNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <div className="submission-warning">
            <b>알아 두세요</b>
            <p>이 자료는 의도를 판단하거나 거래소의 제한 해제를 보장하지 않습니다. 기록을 정리해 보여줄 뿐입니다.</p>
          </div>
        </aside>
      </div>

      <div className="screen-actions report-actions">
        <button className="text-button restart-button" type="button" onClick={onRestart}>처음부터 다시</button>
        <button className="secondary-button" type="button" onClick={onBack}>내용 수정</button>
      </div>
    </section>
  );
}
