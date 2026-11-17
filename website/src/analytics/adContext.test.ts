import {describe, expect, it} from "vitest";
import {checkoutAdContext} from "./adContext.ts";
import {catchAttributionKey} from "./catchMeasurement.ts";

const now = 1_800_000_000_000;
const consent = (marketing: boolean) => ({
  version: 4 as const,
  choice: marketing ? "accepted" as const : "analytics" as const,
  analytics: true,
  marketing,
  updatedAt: "2026-11-17T10:00:00.000Z",
});
const storage = (value: unknown) => ({
  getItem: (key: string) => key === catchAttributionKey ? JSON.stringify(value) : null,
});
const stored = {
  clientId: "123.1800000000",
  sessionId: 1_800_000_000,
  createdAt: now - 60_000,
  lastSeenAt: now - 60_000,
  consentRevision: "2026-11-17T10:00:00.000Z",
  gclid: "Cj0KCQiA_synthetic",
  fbclid: "IwAR_synthetic_click",
  fbclidCapturedAt: now - 60_000,
};
const cookie = "a=1; _fbp=fb.1.1800000000000.1234567890; _fbc=fb.1.1800000000000.IwAR_synthetic_click";

describe("checkout ad context", () => {
  it("sends stored click identifiers and Meta cookies under a marketing choice", () => {
    expect(checkoutAdContext({consent: consent(true), storage: storage(stored), cookie, now})).toEqual({
      gclid: "Cj0KCQiA_synthetic",
      fbclid: "IwAR_synthetic_click",
      fbclidCapturedAtMillis: now - 60_000,
      fbp: "fb.1.1800000000000.1234567890",
      fbc: "fb.1.1800000000000.IwAR_synthetic_click",
    });
  });

  it("sends nothing without a marketing choice", () => {
    expect(checkoutAdContext({consent: consent(false), storage: storage(stored), cookie, now})).toBeUndefined();
    expect(checkoutAdContext({consent: null, storage: storage(stored), cookie, now})).toBeUndefined();
  });

  it("drops click identifiers from an older choice or past their lifetime", () => {
    const changed = {...stored, consentRevision: "2026-11-01T10:00:00.000Z"};
    expect(checkoutAdContext({consent: consent(true), storage: storage(changed), cookie: "", now})).toBeUndefined();
    const old = {...stored, createdAt: now - 31 * 24 * 60 * 60 * 1000};
    expect(checkoutAdContext({consent: consent(true), storage: storage(old), cookie: "", now})).toBeUndefined();
  });

  it("ignores malformed storage and cookies", () => {
    const broken = {getItem: () => "{not json"};
    expect(checkoutAdContext({consent: consent(true), storage: broken, cookie: "_fbp=evil; _fbc=fb.1.x.y", now}))
      .toBeUndefined();
    expect(checkoutAdContext({consent: consent(true), storage: null, cookie: "", now})).toBeUndefined();
  });
});
