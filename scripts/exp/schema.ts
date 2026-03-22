/**
 * subutai.exp.v1 — newline-delimited JSON records (JSONL).
 * Merge: cat shards, sort by (run_id, seq), dedupe sample_id.
 */

export const SCHEMA_VERSION = 'subutai.exp.v1' as const;

export interface ExpProducer {
  readonly name?: string;
  readonly machine?: string;
  readonly user?: string;
}

export interface ExpCode {
  readonly git_commit: string;
  readonly branch: string;
  readonly dirty: boolean;
}

export interface ExpEngine {
  readonly package_version: string;
  readonly eval: string;
  readonly search_depth_budget_ms?: number;
}

export interface ExpGame {
  readonly config960: string;
  readonly seed: number;
  readonly topology_initial: 'A' | 'B';
}

export interface ExpTrial {
  readonly type: 'self_play' | 'rollout' | 'position_eval';
  readonly params: Record<string, unknown>;
}

export interface ExpSample {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly sample_id: string;
  readonly seq: number;
  readonly run_id: string;
  readonly created_at: string;
  readonly producer?: ExpProducer;
  readonly code: ExpCode;
  readonly engine: ExpEngine;
  readonly game: ExpGame;
  readonly trial: ExpTrial;
  readonly metrics: Record<string, unknown>;
  readonly payload?: Record<string, unknown>;
}
