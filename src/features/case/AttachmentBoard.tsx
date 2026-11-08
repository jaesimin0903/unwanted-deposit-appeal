import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ACCEPT_ATTRIBUTE,
  SLOT_LABELS,
  acceptedType,
  filesIn,
  formatSize,
  type AttachmentSlot,
  type PreparedFile,
  type SlotId,
} from "@/features/case/attachments";
import { SCENARIO_MODE, fetchSampleFile } from "@/features/case/scenario";

// 같이 낼 파일을 자료 칸마다 넣고, 넣은 파일을 그 자리에서 열어 봅니다.
// 4단계는 칸 전체(full), 5단계 오른쪽은 요청 자료와 넣은 파일만(compact) 보여줍니다. 파일 상태는 CaseWorkspace가 가집니다.

export interface AttachmentState {
  files: PreparedFile[];
  skipped: SlotId[]; // "해당 없음"으로 표시한 칸
  onAdd: (slot: SlotId, files: File[]) => void;
  onRemove: (id: string) => void;
  onToggleSkip: (slot: SlotId) => void;
}

interface AttachmentBoardProps extends AttachmentState {
  slots: AttachmentSlot[];
  variant: "full" | "compact";
  wantedTitle?: string; // full: 요청 · 통지 자료 묶음의 제목
}

export const pdfViewerEnabled = () => typeof navigator !== "undefined" && navigator.pdfViewerEnabled === true;

function FilePicker({ label, className, onPick }: { label: ReactNode; className: string; onPick: (list: FileList | null) => void }) {
  return (
    <label className={className}>
      {label}
      <input
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          onPick(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function FilePreview({ file, large }: { file: PreparedFile; large: boolean }) {
  if (file.type !== "application/pdf") return <img src={file.url} alt="" />;
  // PDF는 브라우저 PDF 보기로 첫 쪽을 크게 그린 뒤 줄여서 보여줍니다. 지원하지 않는 브라우저는 표시만 합니다.
  if (large && pdfViewerEnabled()) {
    return <iframe src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} tabIndex={-1} aria-hidden="true" title={file.name} />;
  }
  return <span className="pdf-tile">PDF</span>;
}

function FileItem({
  file,
  large,
  onOpen,
  onRemove,
}: {
  file: PreparedFile;
  large: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={large ? "file-item is-large" : "file-item"}>
      <div className="file-frame">
        <FilePreview file={file} large={large} />
        <button type="button" className="file-open" onClick={onOpen} aria-label={`${file.name} 크게 보기`} />
      </div>
      <div className="file-meta">
        <span title={file.name}>{file.name}</span>
        <small>{formatSize(file.size)}</small>
      </div>
      <button type="button" className="text-button file-remove" onClick={onRemove} aria-label={`${file.name} 빼기`}>
        빼기
      </button>
    </li>
  );
}

function SlotRow({
  slot,
  files,
  skipped,
  large,
  onAdd,
  onRemove,
  onToggleSkip,
  onOpen,
}: {
  slot: AttachmentSlot;
  files: PreparedFile[];
  skipped: boolean;
  large: boolean;
  onAdd: (slot: SlotId, files: File[]) => void;
  onRemove: (id: string) => void;
  onToggleSkip: (slot: SlotId) => void;
  onOpen: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [sampleState, setSampleState] = useState<"idle" | "loading" | "failed">("idle");

  // 시연 시나리오: "파일 넣기"를 누르면 이 칸의 예시 파일을 바로 넣습니다 (scenario.ts)
  const insertSample = async () => {
    setSampleState("loading");
    setRejected([]);
    try {
      onAdd(slot.id, [await fetchSampleFile(slot.id)]);
      setSampleState("idle");
    } catch {
      setSampleState("failed");
    }
  };

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const all = Array.from(list);
    setRejected(all.filter((file) => !acceptedType(file)).map((file) => file.name));
    const accepted = all.filter((file) => acceptedType(file));
    if (accepted.length > 0) onAdd(slot.id, accepted);
  };

  const drop = {
    onDragOver: (event: DragEvent) => {
      if (!Array.from(event.dataTransfer.types).includes("Files")) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      take(event.dataTransfer.files);
    },
  };

  const classes = ["slot-row", files.length > 0 ? "has-files" : "", skipped ? "is-skipped" : "", dragging ? "is-dragging" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={slot.label} {...drop}>
      <div className="slot-head">
        <div className="slot-title">
          <b>{slot.label}</b>
          {large ? <small>{slot.hint}</small> : null}
        </div>
        {slot.requestedBy || slot.sourceOfFunds ? (
          <span className="doc-chips">
            {slot.sourceOfFunds ? <span className="field-chip">자금 출처 자료</span> : null}
            {slot.requestedBy ? <span className="field-chip is-verified">{slot.requestedBy}</span> : null}
          </span>
        ) : null}
      </div>

      {files.length > 0 ? (
        <>
          <ul className={large ? "file-grid" : "file-list"}>
            {files.map((file) => (
              <FileItem key={file.id} file={file} large={large} onOpen={() => onOpen(file.id)} onRemove={() => onRemove(file.id)} />
            ))}
            {large ? (
              <li className="file-add">
                <FilePicker className="file-add-tile" label="+ 같은 칸에 더 넣기" onPick={take} />
              </li>
            ) : null}
          </ul>
          {large ? null : <FilePicker className="text-button slot-more" label="+ 더 넣기" onPick={take} />}
        </>
      ) : skipped ? (
        <p className="slot-empty">
          <span>해당 없음으로 표시했어요</span>
          <button type="button" className="text-button" onClick={() => onToggleSkip(slot.id)}>
            되돌리기
          </button>
        </p>
      ) : (
        <div className="slot-empty">
          {SCENARIO_MODE ? (
            <button type="button" className="slot-drop" onClick={insertSample} disabled={sampleState === "loading"}>
              <b>{sampleState === "loading" ? "넣는 중" : "파일 넣기"}</b>
              {large ? (
                <span>
                  <span className="drop-drag">여기로 끌어 놓거나 </span>눌러서 고르기 · PDF, JPG, PNG
                </span>
              ) : null}
            </button>
          ) : (
            <FilePicker
              className="slot-drop"
              onPick={take}
              label={
                <>
                  <b>파일 넣기</b>
                  {large ? (
                    <span>
                      <span className="drop-drag">여기로 끌어 놓거나 </span>눌러서 고르기 · PDF, JPG, PNG
                    </span>
                  ) : null}
                </>
              }
            />
          )}
          {slot.wanted ? (
            <button type="button" className="text-button" onClick={() => onToggleSkip(slot.id)}>
              해당 없음
            </button>
          ) : null}
        </div>
      )}

      {rejected.length > 0 ? (
        <p className="slot-rejected" role="alert">
          PDF, JPG, PNG만 넣을 수 있어요: {rejected.join(", ")}
        </p>
      ) : null}
      {sampleState === "failed" ? (
        <p className="slot-rejected" role="alert">
          파일을 넣지 못했어요. 다시 눌러 주세요.
        </p>
      ) : null}
    </section>
  );
}

// 크게 보기 창. 5단계 소명서의 제출 자료 미리보기에서도 씁니다.
export function FileViewer({
  files,
  openId,
  onSelect,
  onRemove,
}: {
  files: PreparedFile[];
  openId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const index = files.findIndex((file) => file.id === openId);
  const file = index >= 0 ? files[index] : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (file && !dialog.open) dialog.showModal();
    if (!file && dialog.open) dialog.close();
  }, [file]);

  const go = (step: number) => {
    const next = files[index + step];
    if (next) onSelect(next.id);
  };

  return (
    <dialog
      ref={dialogRef}
      className="file-viewer"
      aria-label={file ? `${file.name} 보기` : "파일 보기"}
      onClose={() => onSelect(null)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
      }}
      onClick={(event) => {
        // 바깥 어두운 곳을 누르면 닫습니다
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      {file ? (
        <div className="viewer-panel">
          <header>
            <div>
              <small>
                {SLOT_LABELS[file.slot]} · {index + 1} / {files.length}
              </small>
              <b title={file.name}>{file.name}</b>
            </div>
            <div className="viewer-actions">
              <button type="button" className="secondary-button" onClick={() => go(-1)} disabled={index === 0}>
                이전
              </button>
              <button type="button" className="secondary-button" onClick={() => go(1)} disabled={index === files.length - 1}>
                다음
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const next = files[index + 1] ?? files[index - 1];
                  onRemove(file.id);
                  onSelect(next ? next.id : null);
                }}
              >
                빼기
              </button>
              <button type="button" className="primary-button" onClick={() => onSelect(null)}>
                닫기
              </button>
            </div>
          </header>
          <div className="viewer-body">
            {file.type !== "application/pdf" ? (
              <img src={file.url} alt={file.name} />
            ) : pdfViewerEnabled() ? (
              <iframe src={file.url} title={file.name} />
            ) : (
              <p>
                이 브라우저는 PDF를 화면 안에서 열지 못해요.{" "}
                <a href={file.url} target="_blank" rel="noreferrer">
                  새 탭에서 열기
                </a>
              </p>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

export function AttachmentBoard({ slots, variant, wantedTitle, files, skipped, onAdd, onRemove, onToggleSkip }: AttachmentBoardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const large = variant === "full";
  // 크게 보기에서 이전 · 다음은 칸 순서를 따릅니다
  const ordered = slots.flatMap((slot) => filesIn(files, slot.id));

  const row = (slot: AttachmentSlot) => (
    <SlotRow
      key={slot.id}
      slot={slot}
      files={filesIn(files, slot.id)}
      skipped={skipped.includes(slot.id)}
      large={large}
      onAdd={onAdd}
      onRemove={onRemove}
      onToggleSkip={onToggleSkip}
      onOpen={setOpenId}
    />
  );

  const wanted = slots.filter((slot) => slot.wanted);
  const others = slots.filter((slot) => !slot.wanted);
  // compact: 요청 자료와 파일을 넣은 칸만 늘 보이고, 나머지는 접어 둡니다
  const shown = large ? others : others.filter((slot) => filesIn(files, slot.id).length > 0);
  const folded = large ? [] : others.filter((slot) => filesIn(files, slot.id).length === 0);

  return (
    <div className={large ? "attachment-board" : "attachment-board is-compact"}>
      {wanted.length > 0 ? (
        <div className="slot-group">
          {large && wantedTitle ? <h3>{wantedTitle}</h3> : null}
          {wanted.map(row)}
        </div>
      ) : null}
      {shown.length > 0 ? (
        <div className="slot-group">
          {large && wanted.length > 0 ? <h3>있으면 같이 낼 자료</h3> : null}
          {shown.map(row)}
        </div>
      ) : null}
      {folded.length > 0 ? (
        <details className="slot-fold">
          <summary>다른 자료 넣기 ({folded.length})</summary>
          {folded.map(row)}
        </details>
      ) : null}
      <FileViewer files={ordered} openId={openId} onSelect={setOpenId} onRemove={onRemove} />
    </div>
  );
}
