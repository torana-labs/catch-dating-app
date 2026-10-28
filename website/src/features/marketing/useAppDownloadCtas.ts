import {useCallback, useMemo} from "react";
import {homePageCopy} from "@content/homePage";
import {trackMarketingEvent} from "../../analytics";
import {trackCtaClick} from "./tracking";

export type StorePlatform = "ios" | "android";

export interface AppDownloadCta {
  platform: StorePlatform;
  store: "appStore" | "googlePlay";
  kicker: string;
  label: string;
  accessibleLabel: string;
  /** Empty until CAT-204 switches the store live; a pending store is recorded, not followed. */
  href: string;
  onClick: () => void;
}

// The marketing environment contract (tool/env/check_web_hosting_env.mjs)
// keeps both URLs empty while VITE_STORE_LINKS_MODE is prelaunch.
const storeUrls: Record<StorePlatform, string> = {
  ios: import.meta.env.VITE_APP_STORE_URL?.trim() ?? "",
  android: import.meta.env.VITE_PLAY_STORE_URL?.trim() ?? "",
};

/**
 * Both store buttons for one placement. A live store is followed and its
 * click recorded with the placement and destination; a store that is not
 * live yet records a pending click and stays on the page.
 */
export function useAppDownloadCtas({placement, urls = storeUrls}: {placement: string; urls?: Record<StorePlatform, string>}): AppDownloadCta[] {
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
    {platform: "ios", store: "appStore", ...homePageCopy.stores.appStore, href: urls.ios},
    {platform: "android", store: "googlePlay", ...homePageCopy.stores.googlePlay, href: urls.android},
  ] as const).map((store) => ({...store, onClick: () => click(store.platform, store.href)})), [click, urls]);
}
