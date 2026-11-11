import {
  eventSuccessMomentPresentationFor,
  type EventRuntimeLiveState,
  type EventSuccessMomentPresentationContract,
} from "../../firebase";
import type {EventRuntimeCeremony} from "./eventRuntimeModel";

export const eventRuntimeCeremonyTickMs = 100;

export type EventRuntimeVisualAssetId = "theatrical" | "pulse" | "sunrise";
export type EventRuntimeMarqueePhase =
  | "idle"
  | "anticipation"
  | "climax"
  | "settle";
type EventRuntimeRevealStatus = NonNullable<
  EventRuntimeLiveState["plan"]
>["revealStatus"];

export interface EventRuntimeMarqueeParticle {
  angleTurns: number;
  burstTurns: number;
  distance: number;
  driftTurns: number;
  sizeScale: number;
}

export interface EventRuntimeMarqueeFrame {
  phase: EventRuntimeMarqueePhase;
  phaseProgress: number;
  seedAngleTurns: number;
  tickProgress: number;
  particles: EventRuntimeMarqueeParticle[];
}

const visualAssetPaths: Record<EventRuntimeVisualAssetId, string> = {
  theatrical: new URL(
    "../../../../assets/motion/event_success/theatrical.json",
    import.meta.url
  ).href,
  pulse: new URL(
    "../../../../assets/motion/event_success/pulse.json",
    import.meta.url
  ).href,
  sunrise: new URL(
    "../../../../assets/motion/event_success/sunrise.json",
    import.meta.url
  ).href,
};

const motifBindings: Record<string, EventRuntimeVisualAssetId> = {
  path: "theatrical",
  gate: "theatrical",
  spark: "theatrical",
  signal: "theatrical",
  rhythm: "pulse",
  orbit: "pulse",
  reveal: "pulse",
  afterglow: "sunrise",
};

export function eventRuntimeVisualAssetPath(
  assetId: EventRuntimeVisualAssetId
): string {
  return visualAssetPaths[assetId];
}

export function eventRuntimeVisualAssetForMotif(
  motifId: string
): EventRuntimeVisualAssetId {
  const assetId = motifBindings[motifId];
  if (!assetId) throw new Error(`Unsupported Event Success motif: ${motifId}`);
  return assetId;
}

function resolveEventRuntimeStagePresentation(
  liveState: EventRuntimeLiveState
): EventSuccessMomentPresentationContract {
  const momentKind = liveState.plan?.status === "complete" ? "postEvent" :
    liveState.plan?.revealStartedAtMillis !== null &&
      liveState.plan?.revealStartedAtMillis !== undefined ? "liveReveal" :
    liveState.mission?.status === "active" ? "firstHelloCheckIn" :
    liveState.assignments.length ? "assignment" : "liveStepContext";
  return eventSuccessMomentPresentationFor(momentKind);
}

function eventRuntimeActivityIdForPresentation(
  presentation: EventSuccessMomentPresentationContract,
  revealStatus: EventRuntimeRevealStatus
): string | null {
  const paletteTokenId = presentation.accentPalettePolicyId === "secondary" ||
      (presentation.accentPalettePolicyId === "secondaryUntilReveal" &&
        revealStatus !== "revealed") ?
    presentation.accentPaletteTokenId : presentation.paletteTokenId;
  return activityIdForPaletteToken(paletteTokenId);
}

export function resolveEventRuntimeMarqueeFrame(
  ceremony: EventRuntimeCeremony | null,
  revealStatus: EventRuntimeRevealStatus,
  atMillis: number
): EventRuntimeMarqueeFrame {
  if (!ceremony || revealStatus === "idle") return idleMarqueeFrame();
  const {presentation, seed, timeline} = ceremony;
  let phase: EventRuntimeMarqueePhase = "idle";
  let phaseProgress = 0;
  if (atMillis >= timeline.anticipationStartsAtMillis &&
      atMillis < timeline.climaxStartsAtMillis) {
    phase = "anticipation";
    phaseProgress = progressBetween(
      atMillis,
      timeline.anticipationStartsAtMillis,
      timeline.climaxStartsAtMillis
    );
  } else if (atMillis >= timeline.climaxStartsAtMillis &&
      atMillis < timeline.settleStartsAtMillis) {
    phase = "climax";
    phaseProgress = progressBetween(
      atMillis,
      timeline.climaxStartsAtMillis,
      timeline.settleStartsAtMillis
    );
  } else if (atMillis >= timeline.settleStartsAtMillis &&
      atMillis < timeline.completesAtMillis) {
    phase = "settle";
    phaseProgress = progressBetween(
      atMillis,
      timeline.settleStartsAtMillis,
      timeline.completesAtMillis
    );
  }
  const tempoMs = Math.round(60_000 / presentation.tempoBpm);
  const elapsed = Math.max(0, atMillis - timeline.anticipationStartsAtMillis);
  return {
    phase,
    phaseProgress,
    seedAngleTurns: seed / 0x1_0000_0000,
    tickProgress: tempoMs <= 0 ? 0 : (elapsed % tempoMs) / tempoMs,
    particles: deriveEventRuntimeMarqueeParticles(
      seed,
      presentation.particleDensity
    ),
  };
}

export function deriveEventRuntimeMarqueeParticles(
  seed: number,
  count: number
): EventRuntimeMarqueeParticle[] {
  return Array.from({length: count}, (_, index) => ({
    angleTurns: seededUnit(seed, index, 0),
    burstTurns: seededUnit(seed, index, 4),
    distance: 0.28 + seededUnit(seed, index, 1) * 0.68,
    driftTurns: seededUnit(seed, index, 3),
    sizeScale: 0.6 + seededUnit(seed, index, 2) * 0.9,
  }));
}

function idleMarqueeFrame(): EventRuntimeMarqueeFrame {
  return {
    phase: "idle",
    phaseProgress: 0,
    seedAngleTurns: 0,
    tickProgress: 0,
    particles: [],
  };
}

function progressBetween(value: number, start: number, end: number): number {
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function seededUnit(seed: number, index: number, salt: number): number {
  let value = (
    seed ^
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(salt + 1, 0x85ebca6b)
  ) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0xffff_ffff;
}

function activityIdForPaletteToken(paletteTokenId: string | null): string | null {
  return paletteTokenId === null || paletteTokenId === "editorial.dark" ? null :
    paletteTokenId.replace("activity.", "").replace(
      /[A-Z]/gu,
      (letter) => `-${letter.toLowerCase()}`
    );
}
