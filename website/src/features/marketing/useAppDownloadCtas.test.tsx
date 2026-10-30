import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const trackMarketingEvent = vi.hoisted(() => vi.fn());
const trackCtaClick = vi.hoisted(() => vi.fn());

vi.mock("../../analytics", () => ({trackMarketingEvent}));
vi.mock("./tracking", () => ({trackCtaClick}));

import {useAppDownloadCtas} from "./useAppDownloadCtas";

describe("useAppDownloadCtas", () => {
  beforeEach(() => {
    trackMarketingEvent.mockReset();
    trackCtaClick.mockReset();
    window.history.replaceState({}, "", "/?source=test");
  });

  it("offers both stores and records an unavailable store as pending instead of following it", () => {
    const {result} = renderHook(() => useAppDownloadCtas({placement: "home_hero", urls: {ios: "", android: ""}}));
    expect(result.current.map((store) => [store.store, store.href])).toEqual([["appStore", ""], ["googlePlay", ""]]);
    result.current[0].onClick();
    expect(trackMarketingEvent).toHaveBeenCalledWith("store_cta_pending", {
      platform: "ios",
      placement: "home_hero",
      page_path: "/?source=test",
    });
    expect(trackCtaClick).not.toHaveBeenCalled();
  });

  it("records a live store's navigation with placement and destination", () => {
    const {result} = renderHook(() => useAppDownloadCtas({placement: "home_app_band",
      urls: {ios: "", android: "https://play.google.com/store/apps/details?id=app.catch"}}));
    const play = result.current[1];
    expect(play.href).toBe("https://play.google.com/store/apps/details?id=app.catch");
    play.onClick();
    expect(trackCtaClick).toHaveBeenCalledWith("store_home_app_band_android", play.href);
    expect(trackMarketingEvent).toHaveBeenCalledWith("store_cta_click", {
      platform: "android",
      placement: "home_app_band",
      store_href: play.href,
      page_path: "/?source=test",
    });
  });
});
