import {useState} from "react";
import {hostLandingCopy as copy, hostNightFormats} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";

const feeRate = 0.05;
/** The Catch fee stops growing at this much in a month (a 30-day billing cycle). */
export const feeCap = 10_000;
/** The pricing slider's range and step, in rupees. */
export const salesRange = {min: 0, max: 500_000, step: 5_000} as const;

const money = new Intl.NumberFormat(activeMarket.locale, {style: "currency", currency: activeMarket.currencyCode, maximumFractionDigits: 0});

/** The Catch fee on a month's ticket sales after the trial: 5%, never more than ₹10,000. */
export function catchFee(sales: number) {
  return Math.min(Math.round(sales * feeRate), feeCap);
}

/** The share of sales the fee is, as "5%" or "4.2%". */
export function effectiveRate(sales: number) {
  return `${(sales ? (catchFee(sales) / sales) * 100 : feeRate * 100).toFixed(1).replace(".0", "")}%`;
}

/**
 * The host landing's interactive state, as the board's: the format the
 * tiles, matrix and night scene share, the growth link, the layer and the
 * pricing slider.
 */
export function useHostLandingController() {
  const [format, setFormat] = useState(0);
  const [link, setLink] = useState(0);
  const [layer, setLayer] = useState("0");
  const [sales, setSales] = useState(120_000);

  /** Picks a format; from a tile or the table it also scrolls to the night that follows it. */
  const pickFormat = (index: number, scrollToNight: boolean) => {
    setFormat(index);
    if (scrollToNight && typeof document !== "undefined") {
      const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("night")?.scrollIntoView?.({behavior: reduced ? "auto" : "smooth", block: "start"});
    }
  };

  const current = copy.growth.links[link];
  const fee = catchFee(sales);
  const night = hostNightFormats[format];
  const layerIndex = Number(layer) || 0;
  return {
    format,
    night,
    pickFormat,
    storyLabel: fill(copy.night.storyLabel, {event: night.event}),
    link,
    setLink,
    linkUrl: `${copy.growth.linkBase}${current.slug}`,
    linkStats: {
      visits: current.visits,
      bookings: current.bookings,
      format: current.format,
      visitsLabel: fill(copy.growth.visits, {count: current.visits}),
      bookingsLabel: fill(copy.growth.bookings, {count: current.bookings}),
      rate: `${Math.round((current.bookings / current.visits) * 100)}%`,
      revenue: money.format(current.revenue),
      perVisit: money.format(current.revenue / current.visits),
    },
    maxVisits: Math.max(...copy.growth.links.map((item) => item.visits)),
    layer,
    layerIndex,
    setLayer,
    layerBody: copy.layers.options[layerIndex]?.body ?? "",
    sales,
    setSales,
    salesText: money.format(sales),
    fee,
    feeText: money.format(fee),
    rateText: effectiveRate(sales),
    capped: sales * feeRate >= feeCap,
  };
}

export type HostLandingController = ReturnType<typeof useHostLandingController>;
