import {describe, expect, it} from "vitest";
import {websiteCities} from "@content/markets";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {launchNoticePhone, launchNoticeRequest} from "./launchNoticeModel";

describe("launchNoticePhone", () => {
  it("adds the market's dialling code to a typed mobile number", () => {
    expect(launchNoticePhone("98765 43210", "+91")).toBe("+919876543210");
    expect(launchNoticePhone("098765-43210", "+91")).toBe("+919876543210");
    expect(launchNoticePhone("+91 98765 43210", "+91")).toBe("+919876543210");
    expect(launchNoticePhone("0044 7700 900123", "+91")).toBe("+447700900123");
  });

  it("refuses what can't be a mobile number", () => {
    expect(launchNoticePhone("", "+91")).toBeNull();
    expect(launchNoticePhone("98765", "+91")).toBeNull();
    expect(launchNoticePhone("call me", "+91")).toBeNull();
  });
});

describe("launchNoticeRequest", () => {
  it("is a phone-only member request with marketing off unless ticked", () => {
    const request = launchNoticeRequest("Pune", "+919876543210", false);
    expect(isJoinWaitlistHttpRequest(request)).toBe(true);
    expect(request).toMatchObject({role: "member", whatsapp: {launchNotice: true, marketing: false}});
    expect(request).not.toHaveProperty("email");
    expect(launchNoticeRequest("Pune", "+919876543210", true).whatsapp?.marketing).toBe(true);
  });

  it("names a listed city by catalog id and country, with how the site reached it", () => {
    const pune = websiteCities.find((city) => city.slug === "pune")!;
    const request = launchNoticeRequest(pune.label, "+919876543210", false, {slug: "pune", source: "network_guess"});
    expect(isJoinWaitlistHttpRequest(request)).toBe(true);
    expect(request).toMatchObject({city: pune.label, cityId: pune.id, countryIsoCode: pune.countryIsoCode, citySource: "network_guess"});
    // An unknown source is left out rather than guessed.
    expect(launchNoticeRequest(pune.label, "+919876543210", false, {slug: "pune"})).not.toHaveProperty("citySource");
  });

  it("sends only the label for a city the website does not list", () => {
    const request = launchNoticeRequest("Atlantis", "+919876543210", false, {slug: "atlantis", source: "picked"});
    expect(request).not.toHaveProperty("cityId");
    expect(request).not.toHaveProperty("citySource");
    expect(isJoinWaitlistHttpRequest(request)).toBe(true);
  });
});
