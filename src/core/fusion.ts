import type { HandImpactCandidate, HandSide } from './handImpactDetector';
import type { OnsetEvent } from './onsetDetector';

export type FusionParams = {
  matchWindowMs?: number;
  audioOffsetMs?: number;
};

export type HitEvent = {
  timestampMs: number;
  hand: HandSide;
  visionTimestampMs: number;
  audioTimestampMs: number;
};

export type FusionStats = {
  hits: number;
  visionOnly: number;
  audioOnly: number;
  hitsPerSecond: number;
};

export type FusionLogKind = 'vision' | 'audio' | 'hit' | 'visionOnly' | 'audioOnly';

export type FusionLogEntry = {
  kind: FusionLogKind;
  timestampMs: number;
  matched?: boolean;
  hand?: HandSide;
  visionTimestampMs?: number;
  audioTimestampMs?: number;
  levelDb?: number;
  slowDb?: number;
};

export type Fusion = {
  pushVision: (candidate: HandImpactCandidate) => void;
  pushAudio: (onset: OnsetEvent) => void;
  tick: () => void;
  setParams: (params: FusionParams) => void;
  getStats: () => FusionStats;
  getEventLog: () => readonly FusionLogEntry[];
  reset: () => void;
};

const DEFAULT_MATCH_WINDOW_MS = 130;
const EXPIRE_GRACE_MS = 60;
const HIT_DEBOUNCE_MS = 80;
const HPS_WINDOW_MS = 3000;

type QueuedEvent = {
  timestampMs: number;
  hand?: HandSide;
  logEntry: FusionLogEntry;
};

export function createFusion(
  params: FusionParams = {},
  clock: () => number,
  onHit: (event: HitEvent) => void = () => {},
): Fusion {
  let matchWindowMs = params.matchWindowMs ?? DEFAULT_MATCH_WINDOW_MS;
  let audioOffsetMs = params.audioOffsetMs ?? 0;

  let visionQueue: QueuedEvent[] = [];
  let audioQueue: QueuedEvent[] = [];
  const log: FusionLogEntry[] = [];

  let hits = 0;
  let visionOnly = 0;
  let audioOnly = 0;
  let lastHitTs = Number.NEGATIVE_INFINITY;
  const hitTimes: number[] = [];

  function appendLog(entry: FusionLogEntry): FusionLogEntry {
    log.push(entry);
    return entry;
  }

  function expireAt(nowMs: number): void {
    visionQueue = expireQueue(visionQueue, nowMs, (event) => {
      visionOnly += 1;
      appendLog({
        kind: 'visionOnly',
        timestampMs: event.timestampMs,
        hand: event.hand,
      });
    });
    audioQueue = expireQueue(audioQueue, nowMs, (event) => {
      audioOnly += 1;
      appendLog({
        kind: 'audioOnly',
        timestampMs: event.timestampMs,
        levelDb: event.logEntry.levelDb,
        slowDb: event.logEntry.slowDb,
      });
    });
  }

  function expireQueue(
    queue: QueuedEvent[],
    nowMs: number,
    onExpire: (event: QueuedEvent) => void,
  ): QueuedEvent[] {
    const kept: QueuedEvent[] = [];
    for (const event of queue) {
      if (nowMs > event.timestampMs + matchWindowMs + EXPIRE_GRACE_MS) {
        onExpire(event);
      } else {
        kept.push(event);
      }
    }
    return kept;
  }

  function findNearest(
    queue: QueuedEvent[],
    timestampMs: number,
  ): { event: QueuedEvent; index: number } | null {
    let best: { event: QueuedEvent; index: number } | null = null;
    let bestDt = Number.POSITIVE_INFINITY;
    for (let i = 0; i < queue.length; i += 1) {
      const event = queue[i];
      const dt = Math.abs(event.timestampMs - timestampMs);
      if (dt > matchWindowMs) {
        continue;
      }
      if (
        dt < bestDt ||
        (dt === bestDt && best !== null && event.timestampMs < best.event.timestampMs)
      ) {
        bestDt = dt;
        best = { event, index: i };
      }
    }
    return best;
  }

  function countHit(
    visionTimestampMs: number,
    audioTimestampMs: number,
    hand: HandSide,
  ): void {
    const timestampMs = Math.max(visionTimestampMs, audioTimestampMs);
    if (timestampMs - lastHitTs < HIT_DEBOUNCE_MS) {
      return;
    }
    lastHitTs = timestampMs;
    hits += 1;
    hitTimes.push(timestampMs);
    appendLog({
      kind: 'hit',
      timestampMs,
      hand,
      visionTimestampMs,
      audioTimestampMs,
    });
    onHit({ timestampMs, hand, visionTimestampMs, audioTimestampMs });
  }

  function rollingHitsPerSecond(nowMs: number): number {
    const start = nowMs - HPS_WINDOW_MS;
    let i = 0;
    while (i < hitTimes.length && hitTimes[i] <= start) {
      i += 1;
    }
    if (i > 0) {
      hitTimes.splice(0, i);
    }
    return hitTimes.length / 3;
  }

  function pushVision(candidate: HandImpactCandidate): void {
    expireAt(clock());
    const timestampMs = candidate.timestampMs;
    const logEntry = appendLog({
      kind: 'vision',
      timestampMs,
      matched: false,
      hand: candidate.hand,
    });
    const match = findNearest(audioQueue, timestampMs);
    if (match) {
      audioQueue.splice(match.index, 1);
      logEntry.matched = true;
      match.event.logEntry.matched = true;
      countHit(timestampMs, match.event.timestampMs, candidate.hand);
      return;
    }
    visionQueue.push({ timestampMs, hand: candidate.hand, logEntry });
  }

  function pushAudio(onset: OnsetEvent): void {
    expireAt(clock());
    const timestampMs = onset.timestampMs + audioOffsetMs;
    const logEntry = appendLog({
      kind: 'audio',
      timestampMs,
      matched: false,
      levelDb: onset.levelDb,
      slowDb: onset.slowDb,
    });
    const match = findNearest(visionQueue, timestampMs);
    if (match) {
      visionQueue.splice(match.index, 1);
      logEntry.matched = true;
      match.event.logEntry.matched = true;
      countHit(match.event.timestampMs, timestampMs, match.event.hand ?? 'left');
      return;
    }
    audioQueue.push({ timestampMs, logEntry });
  }

  return {
    pushVision,
    pushAudio,
    tick: () => {
      expireAt(clock());
    },
    setParams: (next: FusionParams) => {
      if (next.matchWindowMs !== undefined) {
        matchWindowMs = next.matchWindowMs;
      }
      if (next.audioOffsetMs !== undefined) {
        audioOffsetMs = next.audioOffsetMs;
      }
    },
    getStats: () => ({
      hits,
      visionOnly,
      audioOnly,
      hitsPerSecond: rollingHitsPerSecond(clock()),
    }),
    getEventLog: () => log.slice(),
    reset: () => {
      visionQueue = [];
      audioQueue = [];
      log.length = 0;
      hits = 0;
      visionOnly = 0;
      audioOnly = 0;
      lastHitTs = Number.NEGATIVE_INFINITY;
      hitTimes.length = 0;
    },
  };
}
