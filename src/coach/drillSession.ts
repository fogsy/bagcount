import type { PunchEvent, PunchType } from '../domain/punchDetector';
import type { Drill, DrillResults, MoveAccuracy } from './drill';

export type DrillSessionConfig = {
  /** Max ms after prompt for a “fast” hit. */
  fastWindowMs: number;
  /** Soft window before prompt times out as miss. */
  promptTimeoutMs: number;
  xpScoreFactor: number;
  xpPerCombo: number;
};

export const DEFAULT_DRILL_SESSION_CONFIG: DrillSessionConfig = {
  fastWindowMs: 900,
  promptTimeoutMs: 2500,
  xpScoreFactor: 0.5,
  xpPerCombo: 10,
};

export type DrillSessionCallbacks = {
  onPrompt?: (move: PunchType, index: number) => void;
  onTick?: (remainingSec: number, round: number) => void;
  onHit?: (event: PunchEvent, expected: PunchType) => void;
  onMiss?: (expected: PunchType) => void;
  onComplete?: (results: DrillResults) => void;
};

type MoveStats = { prompted: number; hit: number };

export class DrillSession {
  private readonly drill: Drill;
  private readonly config: DrillSessionConfig;
  private readonly callbacks: DrillSessionCallbacks;

  private running = false;
  private startedAtMs = 0;
  private elapsedMs = 0;
  private round = 1;
  private promptIndex = 0;
  private promptStartedAtMs = 0;
  private comboProgress = 0;
  private combosCompleted = 0;
  private fastHits = 0;
  private totalHits = 0;
  private totalMisses = 0;
  private readonly stats = new Map<PunchType, MoveStats>();
  private finalResults: DrillResults | null = null;

  constructor(
    drill: Drill,
    callbacks: DrillSessionCallbacks = {},
    config: Partial<DrillSessionConfig> = {},
  ) {
    this.drill = drill;
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_DRILL_SESSION_CONFIG, ...config };
    for (const move of drill.targetMoves) {
      this.stats.set(move, { prompted: 0, hit: 0 });
    }
  }

  get currentPrompt(): PunchType {
    const seq = this.drill.comboSequence;
    return seq[this.promptIndex % seq.length]!;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(nowMs: number): void {
    this.running = true;
    this.startedAtMs = nowMs;
    this.elapsedMs = 0;
    this.round = 1;
    this.promptIndex = 0;
    this.comboProgress = 0;
    this.combosCompleted = 0;
    this.fastHits = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    for (const key of this.stats.keys()) {
      this.stats.set(key, { prompted: 0, hit: 0 });
    }
    this.emitPrompt(nowMs);
    this.callbacks.onTick?.(this.remainingSec(nowMs), this.round);
  }

  /** Drive the timer; call ~every frame or on an interval. */
  tick(nowMs: number): void {
    if (!this.running) {
      return;
    }
    this.elapsedMs = nowMs - this.startedAtMs;
    this.callbacks.onTick?.(this.remainingSec(nowMs), this.round);

    if (nowMs - this.promptStartedAtMs >= this.config.promptTimeoutMs) {
      this.registerMiss();
      this.advancePrompt(nowMs);
    }

    const roundDurationMs = this.drill.durationSec * 1000;
    const totalDurationMs = roundDurationMs * this.drill.rounds;
    if (this.elapsedMs >= totalDurationMs) {
      this.finish();
      return;
    }

    const nextRound = Math.floor(this.elapsedMs / roundDurationMs) + 1;
    if (nextRound > this.round && nextRound <= this.drill.rounds) {
      this.round = nextRound;
    }
  }

  onPunch(event: PunchEvent): void {
    if (!this.running) {
      return;
    }
    const expected = this.currentPrompt;
    if (event.type !== expected) {
      return;
    }

    const stats = this.ensureStats(expected);
    stats.hit += 1;
    this.totalHits += 1;
    const reaction = event.tMs - this.promptStartedAtMs;
    if (reaction <= this.config.fastWindowMs) {
      this.fastHits += 1;
    }
    this.callbacks.onHit?.(event, expected);

    this.comboProgress += 1;
    if (this.comboProgress >= this.drill.comboSequence.length) {
      this.combosCompleted += 1;
      this.comboProgress = 0;
    }
    this.advancePrompt(event.tMs);
  }

  stop(options: { emitComplete?: boolean } = {}): DrillResults {
    return this.finish(options.emitComplete !== false);
  }

  /** End without firing onComplete (e.g. user cancelled). */
  abort(): void {
    this.running = false;
  }

  private emitPrompt(nowMs: number): void {
    const move = this.currentPrompt;
    this.promptStartedAtMs = nowMs;
    this.ensureStats(move).prompted += 1;
    this.callbacks.onPrompt?.(move, this.promptIndex);
  }

  private advancePrompt(nowMs: number): void {
    this.promptIndex += 1;
    if (!this.running) {
      return;
    }
    this.emitPrompt(nowMs);
  }

  private registerMiss(): void {
    const expected = this.currentPrompt;
    this.totalMisses += 1;
    this.comboProgress = 0;
    this.callbacks.onMiss?.(expected);
  }

  private ensureStats(move: PunchType): MoveStats {
    let stats = this.stats.get(move);
    if (stats == null) {
      stats = { prompted: 0, hit: 0 };
      this.stats.set(move, stats);
    }
    return stats;
  }

  private remainingSec(nowMs: number): number {
    const totalMs = this.drill.durationSec * 1000 * this.drill.rounds;
    const left = Math.max(0, totalMs - (nowMs - this.startedAtMs));
    return Math.ceil(left / 1000);
  }

  private finish(emitComplete = true): DrillResults {
    if (this.finalResults != null) {
      return this.finalResults;
    }
    this.running = false;
    const perMove: MoveAccuracy[] = [...this.stats.entries()].map(
      ([move, s]) => ({
        move,
        prompted: s.prompted,
        hit: s.hit,
        accuracy: s.prompted === 0 ? 0 : s.hit / s.prompted,
      }),
    );

    const promptedTotal = perMove.reduce((n, m) => n + m.prompted, 0);
    const hitTotal = perMove.reduce((n, m) => n + m.hit, 0);
    const accuracyOverall = promptedTotal === 0 ? 0 : hitTotal / promptedTotal;
    const speedScore =
      this.totalHits === 0 ? 0 : this.fastHits / this.totalHits;
    const score = Math.round(
      100 * (0.55 * accuracyOverall + 0.25 * speedScore) +
        Math.min(20, this.combosCompleted * 2),
    );
    const clampedScore = Math.min(100, Math.max(0, score));
    const xpEarned =
      Math.floor(clampedScore * this.config.xpScoreFactor) +
      this.config.xpPerCombo * this.combosCompleted;

    const results: DrillResults = {
      drillId: this.drill.id,
      drillName: this.drill.name,
      score: clampedScore,
      xpEarned,
      accuracyOverall,
      speedScore,
      combosCompleted: this.combosCompleted,
      perMove,
      durationSec: this.drill.durationSec * this.drill.rounds,
    };
    this.finalResults = results;
    if (emitComplete) {
      this.callbacks.onComplete?.(results);
    }
    return results;
  }
}
