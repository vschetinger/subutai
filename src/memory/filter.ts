/**
 * Pattern: 8 chars, each R|Q|K|N|B|* (case-insensitive). * = any.
 * Examples: RQKRNBBN (exact), R****BBN (R, any 4, then BBN)
 */
export function matches960Pattern(config: string, pattern: string): boolean {
  const c = config.toUpperCase();
  const p = pattern.toUpperCase().trim();
  if (c.length !== 8 || p.length !== 8) return false;
  for (let i = 0; i < 8; i++) {
    if (p[i] !== '*' && p[i] !== c[i]) return false;
  }
  return true;
}
