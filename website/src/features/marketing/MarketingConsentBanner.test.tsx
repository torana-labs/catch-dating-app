import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {hydrateRoot} from "react-dom/client";
import {afterEach, beforeEach, expect, test, vi} from "vitest";
import {getMarketingConsent, marketingConsentChangedEvent} from "../../analytics";
import {PrivacyChoicesButton} from "../../shared/site";
import {marketingConsentPreferencesCopy} from "../../content/marketingConsent";
import {MarketingConsentBanner} from "./MarketingConsentBanner";

// The page as visitors meet it: the banner, and the footer's "Privacy choices" that reopens it.
const Page = () => <><MarketingConsentBanner /><footer><PrivacyChoicesButton /></footer></>;
afterEach(cleanup);
beforeEach(() => {localStorage.clear(); window.dataLayer = [];});
test("analytics consent is separate from advertising and remains revocable", () => {
  const changed = vi.fn();
  window.addEventListener(marketingConsentChangedEvent, changed);
  render(<Page />);
  fireEvent.click(screen.getByRole("button", {name: "Allow analytics"}));
  expect(getMarketingConsent()).toMatchObject({choice: "analytics", analytics: true, marketing: false});
  expect(screen.queryByRole("button", {name: "Accept all"})).toBeNull();
  expect(window.dataLayer).toContainEqual(["consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  }]);
  fireEvent.click(screen.getByRole("button", {name: "Privacy choices"}));
  fireEvent.click(screen.getByRole("button", {name: "Essential only"}));
  expect(getMarketingConsent()).toMatchObject({analytics: false, marketing: false});
  expect(changed).toHaveBeenCalledTimes(2);
  window.removeEventListener(marketingConsentChangedEvent, changed);
});

test("explicit marketing choice is versioned and can be withdrawn", () => {
  render(<Page />);
  fireEvent.click(screen.getByRole("button", {name: "Allow analytics and marketing"}));
  expect(getMarketingConsent()).toMatchObject({version: 4, analytics: true, marketing: true});
  fireEvent.click(screen.getByRole("button", {name: "Privacy choices"}));
  fireEvent.click(screen.getByRole("button", {name: "Allow analytics"}));
  expect(getMarketingConsent()).toMatchObject({version: 4, analytics: true, marketing: false});
});

test("legacy accepted choice still presents all choices and sibling-tab revocation refreshes the UI", () => {
  localStorage.setItem("catch_marketing_consent_v1", JSON.stringify({choice: "accepted", analytics: true,
    marketing: true, updatedAt: new Date().toISOString()}));
  render(<Page />);
  expect(screen.getByRole("button", {name: "Allow analytics and marketing"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Allow analytics"}));
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.getByRole("button", {name: "Privacy choices"})).toBeTruthy();
  fireEvent(window, new Event(marketingConsentChangedEvent));
  expect(getMarketingConsent()?.marketing).toBe(false);
});

test("Next serves initial consent content and hydrates an existing choice without escalating it", async () => {
  localStorage.setItem("catch_marketing_consent_v4", JSON.stringify({version: 4, measurementMode: "disabled", choice: "essential",
    analytics: false, marketing: false, updatedAt: new Date().toISOString()}));
  const html = renderToString(<MarketingConsentBanner serverRendered />);
  expect(html).toContain("Essential only");
  const container = document.createElement("div");
  container.innerHTML = html; document.body.append(container);
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => {root = hydrateRoot(container, <MarketingConsentBanner serverRendered />,
    {onRecoverableError: error => errors.push(error)});});
  expect(container.textContent).toBe("");
  expect(getMarketingConsent()).toMatchObject({analytics: false, marketing: false});
  expect(errors).toEqual([]);
  await act(async () => root.unmount()); container.remove();
});

test("the banner leads with one line and keeps the whole statement under Details", () => {
  render(<Page />);
  const banner = screen.getByRole("complementary", {name: "Analytics consent"});
  expect(banner.textContent).toContain(marketingConsentPreferencesCopy.summary);
  const details = banner.querySelector("details");
  expect(details?.open).toBe(false);
  expect(details?.querySelector("summary")?.textContent).toBe("Details");
  expect(details?.textContent).toContain(marketingConsentPreferencesCopy.body);
  // Three equal choices, least to most data: none is styled over another.
  const choices = screen.getAllByRole("button").filter((button) => banner.contains(button));
  expect(choices.map((button) => button.textContent)).toEqual(["Essential only", "Allow analytics", "Allow analytics and marketing"]);
  expect(new Set(choices.map((button) => button.className)).size).toBe(1);
});

test("once chosen nothing floats over the page, and Privacy choices reopens the banner with focus", () => {
  render(<Page />);
  fireEvent.click(screen.getByRole("button", {name: "Essential only"}));
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(document.documentElement.dataset.consentOpen).toBeUndefined();
  fireEvent.click(screen.getByRole("button", {name: "Privacy choices"}));
  const banner = screen.getByRole("complementary", {name: "Analytics consent"});
  expect(document.activeElement).toBe(banner);
  expect(document.documentElement.dataset.consentOpen).toBe("");
});
