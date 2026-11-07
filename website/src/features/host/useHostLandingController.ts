import {useEffect, useState} from "react";
import {hostLandingCopy as copy} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";

const feeRate = 0.05;
const feeCap = 10_000;
/** The pricing slider's range and step, in rupees. */
export const salesRange = {min: 0, max: 500_000, step: 10_000} as const;
/** How long each applicant waits between stages while the board plays. */
const pipelineStepMs = 450;

const money = new Intl.NumberFormat(activeMarket.locale, {style: "currency", currency: activeMarket.currencyCode, maximumFractionDigits: 0});

/** The Catch fee on a month's ticket sales: 5%, never more than ₹10,000. */
export function catchFee(sales: number) {
  return Math.min(Math.round(sales * feeRate), feeCap);
}

/** The share of sales the fee is, as "5%" or "4.2%". */
export function effectiveRate(sales: number) {
  return `${(sales ? (catchFee(sales) / sales) * 100 : feeRate * 100).toFixed(1).replace(".0", "")}%`;
}

/**
 * Where each of the ten applicants is after `tick` steps of the board's
 * replay: each starts one step after the one before and moves one stage every
 * two steps, until all of them have shown up.
 */
export function pipelineStages(tick: number, applicants: number, stages: number) {
  return Array.from({length: applicants}, (_, index) => Math.max(0, Math.min(stages - 1, Math.floor((tick - index) / 2))));
}

/**
 * The host landing's interactive state, as the board's: the night's chapter,
 * the pricing slider, the layer, the application card's choices and the
 * applicant board's replay.
 */
export function useHostLandingController() {
  const [chapter, setChapter] = useState(0);
  const [sales, setSales] = useState(120_000);
  const [layer, setLayer] = useState("3");
  const [kind, setKind] = useState<string>("games");
  const [guests, setGuests] = useState(1);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const applicants = copy.pipeline.names.length;
  const stageCount = copy.pipeline.stages.length;
  const lastTick = (applicants - 1) + (stageCount - 1) * 2;

  useEffect(() => {
    if (!playing) return undefined;
    if (tick >= lastTick) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTick((value) => value + 1), pipelineStepMs);
    return () => window.clearTimeout(timer);
  }, [lastTick, playing, tick]);

  const current = copy.night.chapters[chapter];
  const fee = catchFee(sales);
  const stages = playing || tick > 0 ? pipelineStages(tick, applicants, stageCount) : Array.from({length: applicants}, () => 0);
  return {
    chapter,
    chooseChapter: setChapter,
    nowKicker: fill(copy.night.nowKicker, {index: String(chapter + 1).padStart(2, "0"), total: String(copy.night.chapters.length).padStart(2, "0"), time: current.time}),
    nowTitle: current.title,
    sales,
    setSales,
    salesText: money.format(sales),
    feeText: money.format(fee),
    rateText: effectiveRate(sales),
    capNote: fee >= feeCap ? copy.pricing.capped : copy.pricing.uncapped,
    layer,
    setLayer,
    kind,
    setKind,
    guests,
    setGuests,
    /** Each stage's applicants, in the board's order. */
    columns: copy.pipeline.stages.map((_, stage) => copy.pipeline.names.filter((__, index) => stages[index] === stage)),
    replay: () => {
      const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setTick(reduced ? lastTick : 0);
      setPlaying(!reduced);
    },
  };
}

export type HostLandingController = ReturnType<typeof useHostLandingController>;
