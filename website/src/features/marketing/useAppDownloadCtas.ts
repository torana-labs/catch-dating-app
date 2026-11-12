import {useCallback, useMemo} from "react";
import {brand} from "@catch/brand";
import {homePageCopy} from "@content/homePage";
import {trackMarketingEvent} from "../../analytics";
import {trackCtaClick} from "./tracking";

export type StorePlatform = "ios" | "android";

/** Which app the badges download: the Catch app for guests, or Catch Host for hosts. */
export type DownloadApp = "guest" | "host";

export interface AppDownloadCta {
  platform: StorePlatform;
  store: "appStore" | "googlePlay";
  kicker: string;
  label: string;
  /** The badge's words, its accessible name: "Download on the App Store". */
  accessibleLabel: string;
  /** The store's official badge artwork (website/public/assets/store-badges, with provenance). */
  badgeSrc: string;
  /** Shown in place of the badge while the store has no link: "Coming soon on Google Play". */
  comingSoon: {kicker: string; store: string; label: string};
  /** Empty until the store is live for this app; a pending store is recorded, not followed. */
  href: string;
  onClick: () => void;
}

const badgeSrc = {
  appStore: "/assets/store-badges/app-store-download-on-the.svg",
  googlePlay: "/assets/store-badges/google-play-get-it-on.png",
} as const;

// packages/brand/brand.json owns the store links: null until the app is on
// that store, when its badge is a "Coming soon" chip that records the press.
const storeUrls: Record<DownloadApp, Record<StorePlatform, string>> = {
  guest: {ios: brand.stores.consumer.ios ?? "", android: brand.stores.consumer.android ?? ""},
  host: {ios: brand.stores.host.ios ?? "", android: brand.stores.host.android ?? ""},
};

/**
 * Both store badges for one placement. A live store is followed and its
 * click recorded with the placement and destination; a store that is not
 * live yet is a "Coming soon" chip that records a pending click and stays on
 * the page.
 */
export function useAppDownloadCtas({placement, app = "guest", urls}: {placement: string; app?: DownloadApp; urls?: Record<StorePlatform, string>}): AppDownloadCta[] {
  const hrefs = urls ?? storeUrls[app];
  const click = useCallback((platform: StorePlatform, href: string) => {
    const page_path = `${window.location.pathname}${window.location.search}`;
    if (!href) {
      trackMarketingEvent("store_cta_pending", {platform, placement, page_path});
      return;
    }
    trackCtaClick(`store_${placement}_${platform}`, href);
    trackMarketingEvent("store_cta_click", {platform, placement, store_href: href, page_path});
  }, [placement]);
  return useMemo(() => ([
    {platform: "ios", store: "appStore", ...homePageCopy.stores.appStore, badgeSrc: badgeSrc.appStore, href: hrefs.ios},
    {platform: "android", store: "googlePlay", ...homePageCopy.stores.googlePlay, badgeSrc: badgeSrc.googlePlay, href: hrefs.android},
  ] as const).map((store) => ({...store, onClick: () => click(store.platform, store.href)})), [click, hrefs]);
}
