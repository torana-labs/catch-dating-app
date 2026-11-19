import {useEffect, useState} from "react";
import {hostLandingCopy as copy, hostNightFormats, type HostLandingTarget} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {whatsappChatHref} from "@content/site";

/** Where a page link goes: a band on this page, another page, or a WhatsApp chat with its message typed. */
export function hostLandingHref(to: HostLandingTarget): string {
  if ("anchor" in to) return `#${to.anchor}`;
  return "href" in to ? to.href : whatsappChatHref(to.whatsapp);
}

/**
 * A format's night on this page: `#night-<format>`, which picks the format
 * and lands on the night band. The format cards now open each format's page;
 * links made before still land on the night.
 */
export function hostNightHref(format: string): string {
  return `#night-${format}`;
}

function formatForHash(hash: string): number {
  return hostNightFormats.findIndex((item) => hostNightHref(item.format) === hash);
}

function scrollToNight() {
  if (typeof document === "undefined") return;
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("night")?.scrollIntoView?.({behavior: reduced ? "auto" : "smooth", block: "start"});
}

/**
 * The host landing's interactive state: the format the night band follows,
 * and the moment of that night on show. A `#night-<format>` hash picks the
 * format and lands on the night band. The fee band's calculator owns its own state
 * (features/marketing/usePricingFeeCalculator).
 */
export function useHostLandingController() {
  const [format, setFormat] = useState(0);
  const [moment, setMoment] = useState(0);

  /** Picks a format and opens its first moment; from a card it also scrolls to the night that follows it. */
  const pickFormat = (index: number, scroll: boolean) => {
    setFormat(index);
    setMoment(0);
    if (scroll) scrollToNight();
  };

  useEffect(() => {
    const follow = () => {
      const index = formatForHash(window.location.hash);
      if (index < 0) return;
      setFormat(index);
      setMoment(0);
      scrollToNight();
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  const night = hostNightFormats[format];
  return {
    format,
    night,
    moment,
    pickFormat,
    pickMoment: setMoment,
    storyLabel: fill(copy.night.storyLabel, {event: night.event}),
  };
}

export type HostLandingController = ReturnType<typeof useHostLandingController>;
