import {useState} from "react";
import {hostLandingCopy as copy, hostNightFormats, type HostLandingTarget} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {whatsappChatHref} from "@content/site";

/** Where a page link goes: a band on this page, or a WhatsApp chat with its message typed. */
export function hostLandingHref(to: HostLandingTarget): string {
  return "anchor" in to ? `#${to.anchor}` : whatsappChatHref(to.whatsapp);
}

/**
 * The host landing's interactive state: the format the ways band's tiles
 * and the night scene share. The pricing band's calculator owns its own
 * state (features/marketing/usePricingFeeCalculator).
 */
export function useHostLandingController() {
  const [format, setFormat] = useState(0);

  /** Picks a format; from a tile it also scrolls to the night that follows it. */
  const pickFormat = (index: number, scrollToNight: boolean) => {
    setFormat(index);
    if (scrollToNight && typeof document !== "undefined") {
      const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("night")?.scrollIntoView?.({behavior: reduced ? "auto" : "smooth", block: "start"});
    }
  };

  const night = hostNightFormats[format];
  return {
    format,
    night,
    pickFormat,
    storyLabel: fill(copy.night.storyLabel, {event: night.event}),
  };
}

export type HostLandingController = ReturnType<typeof useHostLandingController>;
