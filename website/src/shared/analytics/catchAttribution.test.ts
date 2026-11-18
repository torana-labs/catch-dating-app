import {beforeEach, describe, expect, it} from "vitest";
import {browserAttribution, catchAttributionKey, catchAttributionMaxAgeMs, safeBrowserAttribution} from "../../analytics/catchMeasurement";
const now = 1792486200000;
const consent = {version: 4, analytics: true, marketing: true, updatedAt: "2026-10-20T00:00:00Z"};
const base = {enabled: true, path: "/host/", search: "?gclid=SyntheticGoogle123&fbclid=SyntheticMeta123&email=secret@example.test",
  consent, storage: localStorage, now, random: () => 12345};
beforeEach(() => localStorage.clear());
describe("consented 30-day attribution", () => {
  it("collects nothing before activation, consent or a fresh notice", () => {
    for (const input of [{...base, enabled: false}, {...base, consent: null},
      {...base, consent: {...consent, version: 2}}, {...base, consent: {...consent, analytics: false}}]) {
      localStorage.setItem(catchAttributionKey, "old");
      expect(browserAttribution(input)).toBeNull();
      expect(localStorage.getItem(catchAttributionKey)).toBeNull();
    }
  });
  it("gives analytics a stable ID without advertising identifiers", () => {
    const input = {...base, consent: {...consent, marketing: false}};
    const first = browserAttribution(input);
    expect(first).toEqual({clientId: "12345.1792486200", sessionId: 1792486200});
    expect(browserAttribution({...input, path: "/host/claim/", search: "", now: now + 1000, random: () => 999})).toEqual(first);
    expect(localStorage.getItem(catchAttributionKey)).not.toMatch(/gclid|fbclid|email|secret/u);
  });
  it("retains only valid click identifiers and replaces a new Google touch", () => {
    expect(browserAttribution(base)).toMatchObject({gclid: "SyntheticGoogle123", fbclid: "SyntheticMeta123"});
    expect(browserAttribution({...base, path: "/host/claim/", search: "?wbraid=SecondGoogle123&gclid=person%40example.test"}))
      .toEqual({clientId: "12345.1792486200", sessionId: 1792486200, wbraid: "SecondGoogle123",
        fbclid: "SyntheticMeta123", fbclidCapturedAt: now});
    expect(localStorage.getItem(catchAttributionKey)).not.toMatch(/email|secret|person|landingUrl/u);
  });
  it("keeps the real Meta click timestamp stable across refreshes", () => {
    browserAttribution(base);
    expect(browserAttribution({...base, now: now + 5000})?.fbclidCapturedAt).toBe(now);
    expect(browserAttribution({...base, now: now + 6000, search: "?fbclid=AnotherRealClick123"})?.fbclidCapturedAt)
      .toBe(now + 6000);
  });
  it("resets expired or withdrawn context and rejects private routes", () => {
    browserAttribution(base);
    const expired = browserAttribution({...base, search: "", now: now + catchAttributionMaxAgeMs, random: () => 999});
    expect(expired).toEqual({clientId: "999.1795078200", sessionId: 1795078200});
    browserAttribution({...base, consent: {...consent, analytics: false}});
    expect(localStorage.getItem(catchAttributionKey)).toBeNull();
    for (const path of ["/booking/private/", "/f/private/", "/events/example/", "/organizers/example/", "/claim/private/"]) {
      browserAttribution(base);
      expect(browserAttribution({...base, path})).toBeNull();
      expect(localStorage.getItem(catchAttributionKey)).toBeNull();
    }
  });
  it("retains attribution across browser sessions but starts a new analytics session", () => {
    const first = browserAttribution(base)!;
    sessionStorage.clear();
    const later = browserAttribution({...base, search: "", now: now + 2 * 24 * 60 * 60 * 1000});
    expect(later?.clientId).toBe(first.clientId);
    expect(later?.gclid).toBe(first.gclid);
    expect(later?.sessionId).not.toBe(first.sessionId);
  });
  it("cannot carry marketing identifiers across a changed consent revision", () => {
    browserAttribution(base);
    expect(browserAttribution({...base, search: "", random: () => 999,
      consent: {...consent, marketing: false, updatedAt: "2026-10-20T01:00:00Z"}}))
      .toEqual({clientId: "999.1792486200", sessionId: 1792486200});
  });
  it("fails closed on unavailable storage or malformed identifiers", () => {
    expect(browserAttribution({...base, storage: {getItem() {throw new Error("denied");}, setItem() {}, removeItem() {}}})).toBeNull();
    expect(safeBrowserAttribution({clientId: "person@example.test", sessionId: now}, true)).toBeNull();
    expect(safeBrowserAttribution({clientId: "123.1792486200", sessionId: 1792486200,
      gclid: "https://private.test", email: "secret@example.test"}, true))
      .toEqual({clientId: "123.1792486200", sessionId: 1792486200});
  });
});
