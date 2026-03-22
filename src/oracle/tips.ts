import type { ArchetypeScores } from './strength';

/** Cryptic coaching hints — not specific moves (guardrail). */
export function crypticTipFromArchetype(a: ArchetypeScores, side: 'white' | 'black'): string {
  const parts: string[] = [];
  if (a.transition > 0.55) parts.push('The pattern shifts; what held may not hold.');
  if (a.danger > 0.35) parts.push('Edges glitter—step with care.');
  if (a.force > 0.4) parts.push('Force gathers; not every door must open.');
  if (a.receptivity > 0.45) parts.push('Yielding ground can still shape the field.');
  if (a.clarity > 0.45) parts.push('Light finds the crack; look once, then move.');
  if (parts.length === 0) {
    return side === 'white'
      ? 'The board asks for patience, not proof.'
      : 'Shadow holds its own counsel; answer with form.';
  }
  return parts.slice(0, 2).join(' ');
}
