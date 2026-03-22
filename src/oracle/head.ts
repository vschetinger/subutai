/**
 * Tiny 12→8→1 MLP for oracle tie-break / Phase-1 distillation hook.
 * Weights default to small random-like fixed values (deterministic) until trained offline.
 */
const INPUT_DIM = 12;
const HIDDEN = 8;

function seededWeight(i: number, j: number): number {
  const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 0.2 - 0.1;
}

let W1: Float32Array | null = null;
let B1: Float32Array | null = null;
let W2: Float32Array | null = null;
let B2: number | null = null;

function ensureWeights(): void {
  if (W1) return;
  W1 = new Float32Array(INPUT_DIM * HIDDEN);
  B1 = new Float32Array(HIDDEN);
  for (let i = 0; i < INPUT_DIM * HIDDEN; i++) {
    W1[i] = seededWeight(i % INPUT_DIM, Math.floor(i / INPUT_DIM));
  }
  for (let j = 0; j < HIDDEN; j++) B1[j] = seededWeight(j, 99) * 0.1;
  W2 = new Float32Array(HIDDEN);
  for (let j = 0; j < HIDDEN; j++) W2[j] = seededWeight(j, 100) * 0.15;
  B2 = seededWeight(0, 101) * 0.05;
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

/** Output roughly in [-1, 1] for blending. */
export function tinyMlpScore(features: Float32Array): number {
  ensureWeights();
  const h = new Float32Array(HIDDEN);
  for (let j = 0; j < HIDDEN; j++) {
    let s = B1![j]!;
    for (let i = 0; i < INPUT_DIM; i++) {
      s += features[i]! * W1![i * HIDDEN + j]!;
    }
    h[j] = relu(s);
  }
  let out = B2!;
  for (let j = 0; j < HIDDEN; j++) out += h[j]! * W2![j]!;
  return Math.tanh(out);
}
