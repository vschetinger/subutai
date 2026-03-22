/** Max absolute centipawn adjustment from oracle bias (guardrail). */
export const MAX_ORACLE_CENTIPAWNS = 45;

/** Default blend: 0 = oracle does not affect AI eval (player-only oracle). */
let oracleEvalBlend = 0;

export function getOracleEvalBlend(): number {
  return oracleEvalBlend;
}

export function setOracleEvalBlend(n: number): void {
  oracleEvalBlend = Math.max(0, Math.min(1, n));
}
