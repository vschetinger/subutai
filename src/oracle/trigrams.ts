/**
 * Ba Gua indices 0–7 (binary order: bit0 = bottom line).
 * Names are traditional; tags are for archetype scoring (hand-tunable).
 */
export const TRIGRAM_NAMES = [
  'Earth',
  'Mountain',
  'Water',
  'Wind',
  'Thunder',
  'Fire',
  'Lake',
  'Heaven',
] as const;

/** Rough tags for strength logic: each trigram contributes to these dimensions [-1, 1]. */
export const TRIGRAM_TAGS: readonly {
  readonly force: number;
  readonly receptivity: number;
  readonly danger: number;
  readonly clarity: number;
}[] = [
  { force: -0.2, receptivity: 0.9, danger: -0.3, clarity: -0.2 }, // Earth
  { force: 0.2, receptivity: 0.3, danger: 0.2, clarity: 0.4 }, // Mountain
  { force: -0.1, receptivity: 0.1, danger: 0.85, clarity: -0.2 }, // Water
  { force: 0.1, receptivity: 0.2, danger: -0.1, clarity: 0.5 }, // Wind
  { force: 0.75, receptivity: -0.3, danger: 0.2, clarity: 0.1 }, // Thunder
  { force: 0.4, receptivity: -0.2, danger: 0.3, clarity: 0.5 }, // Fire
  { force: 0.2, receptivity: 0.1, danger: -0.2, clarity: 0.7 }, // Lake
  { force: 0.95, receptivity: -0.4, danger: -0.1, clarity: 0.6 }, // Heaven
];
