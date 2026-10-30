import {describe, expect, it} from "vitest";
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
});
