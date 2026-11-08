import { useRef, useState } from "react";
import { AddressText } from "@/features/case/AddressText";
import { AttachmentBoard, FileViewer, pdfViewerEnabled, type AttachmentState } from "@/features/case/AttachmentBoard";
import type { StatementPart } from "@/features/case/screens/StatementScreen";
import {
  SLOT_LABELS,
  SOURCE_OF_FUNDS_DOCUMENTS,
  attachmentSlots,
  filesIn,
  type ExtraSlotId,
  type PreparedFile,
} from "@/features/case/attachments";
import { parseNotice } from "@/features/case/notice";
import { SCENARIO_MODE, SAMPLE_APPLICANT } from "@/features/case/scenario";
import { SourceLinks } from "@/features/case/SourceLinks";
import { RESTRICTION_LABELS, SCOPE_LABELS, exchangeLabel, getProfile, todayInSeoul } from "@/profiles";
import { appealDocuments } from "@/server/report/appeal"; // 순수 함수: 5단계에서 파일을 넣거나 빼면 제출 자료 목록을 바로 다시 만듭니다
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

function paperDocuments(documents: ReportDocument[]) {
  return documents.filter(
    (document): document is ReportDocument & { status: Exclude<DocumentStatus, "needed"> } => document.status !== "needed",
  );
}

// 소명서 "제출 자료"에 적을 줄: 자료 종류마다 상태와 넣은 파일 이름, 그다음 통지 · 계정 화면 같은 그 밖의 칸
const EXTRA_SLOTS: ExtraSlotId[] = ["notice", "account", "other"];

interface PaperDocumentRow {
  key: string;
  label: string;
  status: Exclude<DocumentStatus, "needed">;
  files: PreparedFile[]; // 소명서에 작은 미리보기로 보여 줌
  fileNames: string[];
}

function paperDocumentRows(documents: ReportDocument[], files: PreparedFile[]): PaperDocumentRow[] {
  const rows: PaperDocumentRow[] = paperDocuments(documents).map((document) => {
    const inSlot = filesIn(files, document.id);
    return { key: document.id, label: document.label, status: document.status, files: inSlot, fileNames: inSlot.map((file) => file.name) };
  });
  for (const slot of EXTRA_SLOTS) {
    const inSlot = filesIn(files, slot);
    if (inSlot.length > 0) {
      rows.push({ key: slot, label: SLOT_LABELS[slot], status: "ready", files: inSlot, fileNames: inSlot.map((file) => file.name) });
    }
  }
  return rows;
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
  attachments: AttachmentState;
  onBack: () => void;
  onEditPart: (part: StatementPart) => void; // 4단계의 그 순서로 돌아가 고치기
  onRestart: () => void;
}

// "제출 문안 복사"용 글자 버전. 화면의 소명서와 같은 순서로 씁니다.
function reportText(
  report: CaseReport,
  rows: PaperDocumentRow[],
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
  for (const row of rows) {
    const names = row.fileNames.length > 0 ? ` (파일: ${row.fileNames.join(", ")})` : "";
    lines.push(`- ${row.label}: ${PAPER_DOCUMENT_STATUS[row.status]}${names}`);
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

// 소명서 맨 위 한 줄. "아직 모름 · 모름"처럼 읽히지 않게, 모르는 값은 "확인 전"으로 씁니다.
function restrictionHeading(submission: SubmissionDetails) {
  const type = submission.restrictionType === "unknown" ? null : RESTRICTION_LABELS[submission.restrictionType];
  const scope = submission.scope === "unknown" ? null : SCOPE_LABELS[submission.scope];
  if (!type && !scope) return "제한 내용 확인 전";
  return [type ?? "제한 유형 확인 전", scope].filter(Boolean).join(" · ");
}

export function ReportScreen({ submission, analysis, statement, report, attachments, onBack, onEditPart, onRestart }: ReportScreenProps) {
  const [copyState, setCopyState] = useState<string>();
  const [applicant, setApplicant] = useState<Applicant>({ name: "", account: "", contact: "" });
  const applicantRef = useRef<HTMLFieldSetElement>(null);
  if (!analysis || !report) return null;
  const today = todayInSeoul();
  const daysLeft = daysLeftLabel(report.route.deadline.date, today);
  // 통지가 자금 출처 자료를 요구했으면, 이 도구가 만들지 않는 그 자료를 "같이 낼 자료" 맨 위에 둡니다
  const asksSourceOfFunds = parseNotice(submission.requestText, today).asksSourceOfFunds;
  // 통지가 자금 출처를 따로 요구하지 않았으면, 요구받을 때를 대비한 안내 한 줄만 남깁니다
  const fundsNote = asksSourceOfFunds
    ? undefined
    : report.additionalDocuments.find((document) => document.startsWith("자금 출처를 추가로 요구받은 경우"));
  const { transfer, scope, walletAddress } = analysis;
  const hasExchange = submission.exchange !== "unspecified";
  const profile = getProfile(submission.exchange);
  // 국내 거래소는 "1:1 문의", 해외 거래소는 채팅 · 티켓처럼 창구가 달라서 "문의"로 씁니다 (창구 이름은 아래 제출 칸에 있음)
  const inquiry = profile && profile.group !== "kr" ? "문의" : "1:1 문의";
  // 서버가 만든 목록과 같은 함수로, 5단계에서 넣은 파일까지 반영해 다시 만듭니다 (온체인 기록과는 상관없는 부분)
  const documents = appealDocuments({ submission, statement, profile });
  const documentRows = paperDocumentRows(documents, attachments.files);
  // 소명서 미리보기에서 크게 볼 파일 (이전 · 다음은 소명서에 적힌 순서)
  const paperFiles = documentRows.flatMap((row) => row.files);
  const [paperOpenId, setPaperOpenId] = useState<string | null>(null);
  const pdfPreview = pdfViewerEnabled();
  const slots = attachmentSlots({ submission, profile, asksSourceOfFunds });
  // 파일을 넣었고 요청 · 요구 자료 칸이 모두 찼거나 "해당 없음"이면, 5단계에서는 파일 칸을 접어 둡니다
  const filesSettled =
    attachments.files.length > 0 &&
    slots.every((slot) => !slot.wanted || filesIn(attachments.files, slot.id).length > 0 || attachments.skipped.includes(slot.id));
  // 입금 경위 설명은 소명서 본문이라 파일로 낼 수 없고, 내용 수정에서 답하도록 안내합니다
  const missingDeposit = documents.some((document) => document.id === "depositReason" && document.status === "needed");
  // 자금 출처 자료 칸에 파일이 하나라도 있으면 경고 대신 안내로
  const sourceFiles = attachments.files.filter((file) => (SOURCE_OF_FUNDS_DOCUMENTS as string[]).includes(file.slot)).length;
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
      await navigator.clipboard.writeText(reportText(report, documentRows, analysis, statement, submission, applicant));
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
          <p>신청인 칸을 채우고 내용을 확인한 뒤, &ldquo;이렇게 내세요&rdquo; 순서대로 내세요.</p>
        </div>
      </div>

      <div className="report-layout">
        <article className="report-paper">
          <fieldset className="applicant-fields" ref={applicantRef}>
            <legend>
              신청인 정보 · 소명서에만 적히고 서버로 보내지 않아요
              {SCENARIO_MODE ? (
                // 시연 시나리오: 예시 계정 화면과 같은 가짜 정보를 넣습니다 (scenario.ts)
                <button
                  type="button"
                  className="text-button applicant-sample"
                  onClick={() => setApplicant(SAMPLE_APPLICANT)}
                  disabled={filledApplicant === 3}
                >
                  예시 정보 넣기
                </button>
              ) : null}
            </legend>
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
              <p>{restrictionHeading(submission)}</p>
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
              {documentRows.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <span className={`document-status is-${row.status}`}>{PAPER_DOCUMENT_STATUS[row.status]}</span>
                  {row.files.length > 0 ? (
                    // 넣은 파일을 작게 보여 주고, 누르면 크게 봅니다. 인쇄 · PDF 저장에도 그대로 들어갑니다.
                    <ul className="paper-files">
                      {row.files.map((file) => (
                        <li key={file.id}>
                          <button type="button" className="paper-file" onClick={() => setPaperOpenId(file.id)} aria-label={`${file.name} 크게 보기`}>
                            {file.type !== "application/pdf" ? (
                              <img src={file.url} alt="" />
                            ) : (
                              <>
                                {/* PDF는 화면에서 첫 쪽을 작게 보여 주고, 인쇄에는 iframe이 찍히지 않아 "PDF" 표시를 씁니다 */}
                                {pdfPreview ? (
                                  <iframe
                                    className="paper-pdf"
                                    src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    title={file.name}
                                  />
                                ) : null}
                                <span className={pdfPreview ? "pdf-tile print-only" : "pdf-tile"}>PDF</span>
                              </>
                            )}
                          </button>
                          <small title={file.name}>{file.name}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            <FileViewer files={paperFiles} openId={paperOpenId} onSelect={setPaperOpenId} onRemove={attachments.onRemove} />
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
                {filledApplicant < 3 ? `소명서 맨 위 신청인 칸 3개 중 ${filledApplicant}개 채움` : "3개 모두 채움"}
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
                      <button type="button" className="text-button" onClick={() => onEditPart("questions")}>
                        내용 수정에서 답하기
                      </button>
                    </li>
                  ) : null}
                  {outgoingUnexplained && firstOutgoing ? (
                    <li className="is-optional">
                      <span>
                        기록 「<AddressText text={firstOutgoing.title} />」에 대한 본인 설명이 없어요
                      </span>
                      <button type="button" className="text-button" onClick={() => onEditPart("note")}>
                        내용 수정에서 적기
                      </button>
                    </li>
                  ) : null}
                </ul>
              </li>
            ) : null}
            <li>
              <b>같이 낼 자료 넣기</b>
              <p>파일을 넣으면 소명서의 제출 자료 목록에 이름이 적혀요. 눌러서 내용을 확인하세요.</p>
              {asksSourceOfFunds ? (
                <p className={sourceFiles > 0 ? "submit-info" : "submit-needed"}>
                  통지가 요구한 <b>자금 출처 자료</b>(원화 입금 · 매수 내역, 급여 · 이체 내역 등)는 이 도구가 만들지 않아요.{" "}
                  {sourceFiles > 0 ? `자금 출처 자료 칸에 파일 ${sourceFiles}개를 넣었어요.` : "따로 준비해 아래 칸에 넣어 주세요."}
                </p>
              ) : null}
              {filesSettled ? (
                // 4단계에서 다 넣었으면 접어 둡니다. 파일 이름은 왼쪽 소명서의 제출 자료에도 적혀 있어요.
                <details className="submit-files">
                  <summary>넣은 파일 {attachments.files.length}개 보기 · 바꾸기</summary>
                  <AttachmentBoard slots={slots} variant="compact" {...attachments} />
                </details>
              ) : (
                <AttachmentBoard slots={slots} variant="compact" {...attachments} />
              )}
              {fundsNote ? <p>{fundsNote}</p> : null}
            </li>
            <li>
              <b>소명서 저장</b>
              <p>{inquiry} 글에는 복사한 문안을 붙여넣고, PDF와 위에서 넣은 파일을 첨부 파일로 올리세요.</p>
              <div className="submit-buttons">
                <button className="primary-button" type="button" onClick={savePdf}>
                  PDF로 저장
                </button>
                <button className="secondary-button" type="button" onClick={copyText}>
                  {inquiry}용 글 복사
                </button>
              </div>
              {copyState ? <p className="copy-state" role="status">{copyState}</p> : null}
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
        <button className="primary-button" type="button" onClick={savePdf}>PDF로 저장</button>
      </div>
    </section>
  );
}
