import { useMemo, useState } from 'react';
import type { BoardState, SquareId } from '../engine';
import {
  castFromBoard,
  g,
  judgmentForHexagram,
  TRIGRAM_NAMES,
  trigramsFromHexagramIndex,
  setOracleEvalBlend,
  getOracleEvalBlend,
  MAX_ORACLE_CENTIPAWNS,
} from './index';
import { crypticTipFromArchetype } from './tips';

interface OraclePanelProps {
  readonly state: BoardState;
  readonly lastMove: { from?: SquareId; to?: SquareId } | null;
}

export function OraclePanel({ state, lastMove }: OraclePanelProps) {
  const [blendPct, setBlendPct] = useState(() => Math.round(getOracleEvalBlend() * 100));

  const white = useMemo(() => {
    const c = castFromBoard(state, 'white', lastMove ?? undefined);
    const arch = g(c.hexagramIndex, c.changingLines);
    const [lo, hi] = trigramsFromHexagramIndex(c.hexagramIndex);
    return { cast: c, arch, lo, hi };
  }, [state, lastMove]);

  const black = useMemo(() => {
    const c = castFromBoard(state, 'black', lastMove ?? undefined);
    const arch = g(c.hexagramIndex, c.changingLines);
    const [lo, hi] = trigramsFromHexagramIndex(c.hexagramIndex);
    return { cast: c, arch, lo, hi };
  }, [state, lastMove]);

  const tipW = crypticTipFromArchetype(white.arch, 'white');
  const tipB = crypticTipFromArchetype(black.arch, 'black');

  return (
    <details className="oracle-details">
      <summary>I Ching (reading)</summary>
      <div className="oracle-content">
        <p className="oracle-guardrail">
          Cryptic counsel only — not a move list. AI blend affects search only when slider &gt; 0.
        </p>

        <div className="oracle-blend-row">
          <label htmlFor="oracle-blend">Oracle influence on AI eval</label>
          <input
            id="oracle-blend"
            type="range"
            min={0}
            max={100}
            value={blendPct}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBlendPct(v);
              setOracleEvalBlend(v / 100);
            }}
          />
          <span className="oracle-blend-val">{blendPct}%</span>
          <span className="oracle-max-hint">(max ±{MAX_ORACLE_CENTIPAWNS} cp)</span>
        </div>

        <div className="oracle-dual-grid">
          <section className="oracle-side">
            <h4 className="oracle-side-title">As White reads</h4>
            <div className="oracle-meta">
              Hex. {white.cast.hexagramIndex + 1} · changing {(white.cast.changingLines & 0x3f).toString(2).padStart(6, '0')}
            </div>
            <div className="oracle-trigrams">
              {TRIGRAM_NAMES[white.lo]} below · {TRIGRAM_NAMES[white.hi]} above
            </div>
            <blockquote className="oracle-quote">{judgmentForHexagram(white.cast.hexagramIndex)}</blockquote>
            <p className="oracle-tip">{tipW}</p>
            <OracleScores a={white.arch} />
          </section>
          <section className="oracle-side">
            <h4 className="oracle-side-title">As Black reads</h4>
            <div className="oracle-meta">
              Hex. {black.cast.hexagramIndex + 1} · changing {(black.cast.changingLines & 0x3f).toString(2).padStart(6, '0')}
            </div>
            <div className="oracle-trigrams">
              {TRIGRAM_NAMES[black.lo]} below · {TRIGRAM_NAMES[black.hi]} above
            </div>
            <blockquote className="oracle-quote">{judgmentForHexagram(black.cast.hexagramIndex)}</blockquote>
            <p className="oracle-tip">{tipB}</p>
            <OracleScores a={black.arch} />
          </section>
        </div>
      </div>
    </details>
  );
}

function OracleScores({ a }: { a: ReturnType<typeof g> }) {
  return (
    <dl className="oracle-scores">
      <dt>force</dt>
      <dd>{a.force.toFixed(2)}</dd>
      <dt>receptivity</dt>
      <dd>{a.receptivity.toFixed(2)}</dd>
      <dt>danger</dt>
      <dd>{a.danger.toFixed(2)}</dd>
      <dt>clarity</dt>
      <dd>{a.clarity.toFixed(2)}</dd>
      <dt>transition</dt>
      <dd>{a.transition.toFixed(2)}</dd>
    </dl>
  );
}
