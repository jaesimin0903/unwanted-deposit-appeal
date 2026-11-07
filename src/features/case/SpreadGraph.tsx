import { SPREAD_SENDER, SPREAD_VIEW, spreadLayout } from "@/features/case/analysis-view";
import { shortAddress } from "@/features/case/utils";
import type { CaseAnalysis } from "@/types/case";

// 퍼짐 그림: 보낸 주소 하나 → 받은 주소들. 내 지갑은 받은 주소 중 하나로 그립니다.
// (예전 그래프는 보낸 주소 → 내 지갑 → 다른 주소 순서로 한 줄에 놓여, 내 지갑이 다시 보낸 것처럼 읽혔습니다)
export function SpreadGraph({ analysis }: { analysis: CaseAnalysis }) {
  const { facts, scope, transfer } = analysis;
  const { dots, hidden } = spreadLayout(facts.senderRecipientCount, facts.similarAmountCount);
  const mine = dots.find((dot) => dot.kind === "mine") ?? dots[0];
  const others = dots.filter((dot) => dot !== mine);
  const total = Math.max(1, facts.senderRecipientCount);
  const similar = Math.min(Math.max(1, facts.similarAmountCount), total);
  const different = total - similar;
  const senderRight = SPREAD_SENDER.x + 48;

  return (
    <figure className="spread-panel">
      <figcaption>보낸 주소가 보낸 곳 · {scope.windowLabel}</figcaption>
      <svg
        viewBox={`0 0 ${SPREAD_VIEW.width} ${SPREAD_VIEW.height}`}
        role="img"
        aria-label={`보낸 주소가 ${scope.windowLabel} 동안 ${total}곳에 보냈고, 그중 ${similar}곳이 비슷한 금액입니다. 내 지갑도 그중 하나입니다.`}
      >
        <g>
          {others.map((dot, index) => (
            <line key={index} x1={senderRight} y1={SPREAD_SENDER.y} x2={dot.x} y2={dot.y} className="spread-line" />
          ))}
        </g>
        <line x1={senderRight} y1={SPREAD_SENDER.y} x2={mine.x} y2={mine.y} className="spread-line-mine" />
        <g>
          {others.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={4.5} className={dot.kind === "other" ? "spread-dot-other" : "spread-dot"} />
          ))}
        </g>
        <circle cx={mine.x} cy={mine.y} r={10.5} className="spread-ring" />
        <circle cx={mine.x} cy={mine.y} r={6.5} className="spread-mine" />
        <rect x={mine.x - 82} y={mine.y - 10} width={56} height={20} rx={4} className="spread-tag" />
        <text x={mine.x - 54} y={mine.y + 4.5} textAnchor="middle" className="spread-mine-label">내 지갑</text>
        <rect x={SPREAD_SENDER.x - 48} y={SPREAD_SENDER.y - 22} width={96} height={44} rx={6} className="spread-node" />
        <text x={SPREAD_SENDER.x} y={SPREAD_SENDER.y - 3} textAnchor="middle" className="spread-label">보낸 주소</text>
        <text x={SPREAD_SENDER.x} y={SPREAD_SENDER.y + 13} textAnchor="middle" className="spread-address">
          {shortAddress(transfer.from, 6, 4)}
        </text>
        {hidden > 0 ? (
          <text x={SPREAD_VIEW.width - 12} y={SPREAD_VIEW.height - 3} textAnchor="end" className="spread-more">
            외 {hidden.toLocaleString("en-US")}곳
          </text>
        ) : null}
      </svg>
      <ul className="spread-legend">
        <li><i className="spread-key spread-key-similar" />비슷한 금액 {similar}곳</li>
        {different > 0 ? <li><i className="spread-key spread-key-other" />다른 금액 {different}곳</li> : null}
        <li><i className="spread-key spread-key-mine" />내 지갑</li>
      </ul>
    </figure>
  );
}
