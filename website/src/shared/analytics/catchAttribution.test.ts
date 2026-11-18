import {beforeEach, describe, expect, it} from "vitest";
import {browserAttribution, catchAttributionKey, catchAttributionMaxAgeMs, safeBrowserAttribution} from "../../analytics/catchMeasurement";
const now = 1792486200000;
const consent = {version: 5, analytics: true, marketing: true, updatedAt: "2026-10-20T00:00:00Z"};
const base = {enabled: true, path: "/host/", search: "?gclid=SyntheticGoogle123&fbclid=SyntheticMeta123&email=secret@example.test",
  consent, storage: localStorage, now, random: () => 12345};
beforeEach(() => localStorage.clear());
describe("consented 30-day attribution", () => {
  it("collects nothing before activation, consent or a fresh notice", () => {
    for (const input of [{...base, enabled: false}, {...base, consent: null},
      {...base, consent: {...consent, version: 4}}, {...base, consent: {...consent, analytics: false}}]) {
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
      .toEqual({clientId: "12345.1792486200", sessionId: 1792486200, wbraid: "SecondGoogle123", googleClickCapturedAt: now,
        fbclid: "SyntheticMeta123", fbclidCapturedAt: now});
    expect(localStorage.getItem(catchAttributionKey)).not.toMatch(/email|secret|person|landingUrl/u);
  });
  it("keeps the real Meta click timestamp stable across refreshes", () => {
    browserAttribution(base);
    expect(browserAttribution({...base, now: now + 5000})?.fbclidCapturedAt).toBe(now);
    expect(browserAttribution({...base, now: now + 6000, search: "?fbclid=AnotherRealClick123"})?.fbclidCapturedAt)
      .toBe(now + 6000);
  });
  it("resets expired or withdrawn context", () => {
    browserAttribution(base);
    const expired = browserAttribution({...base, search: "", now: now + catchAttributionMaxAgeMs, random: () => 999});
    expect(expired).toEqual({clientId: "999.1795078200", sessionId: 1795078200});
    browserAttribution({...base, consent: {...consent, analytics: false}});
    expect(localStorage.getItem(catchAttributionKey)).toBeNull();
  });
  it("neither reads nor clears the context on private, organiser and token pages", () => {
    browserAttribution(base);
    const stored = localStorage.getItem(catchAttributionKey);
    for (const path of ["/booking/private/", "/f/private/", "/organizers/example/", "/claim/private/", "/invite/private/", "/account/"]) {
      expect(browserAttribution({...base, path, search: "?gclid=PrivatePageClick123"})).toBeNull();
      expect(localStorage.getItem(catchAttributionKey)).toBe(stored);
    }
    expect(browserAttribution({...base, path: "/events/example/", search: "", now: now + 1000}))
      .toMatchObject({gclid: "SyntheticGoogle123", fbclid: "SyntheticMeta123"});
  });
  it("records when each click was first seen and restarts the 30-day lifetime on a new click", () => {
    browserAttribution(base);
    const later = now + 20 * 24 * 60 * 60 * 1000;
    expect(browserAttribution({...base, search: "?gclid=LaterGoogleClick123", now: later}))
      .toMatchObject({gclid: "LaterGoogleClick123", googleClickCapturedAt: later, fbclid: "SyntheticMeta123", fbclidCapturedAt: now});
    expect(browserAttribution({...base, search: "", now: later + 25 * 24 * 60 * 60 * 1000}))
      .toMatchObject({gclid: "LaterGoogleClick123"});
  });
  it("retains attribution across browser sessions but starts a new analytics session", () => {
    const first = browserAttribution(base)!;
    sessionStorage.clear();
    const later = browserAttribution({...base, search: "", now: now + 2 * 24 * 60 * 60 * 1000});
    expect(later?.clientId).toBe(first.clientId);
    expect(later?.gclid).toBe(first.gclid);
    expect(later?.sessionId).not.toBe(first.sessionId);
  });
  it("cannot carry marketing identifiers into a changed choice without marketing", () => {
    browserAttribution(base);
    expect(browserAttribution({...base, search: "", random: () => 999,
      consent: {...consent, marketing: false, updatedAt: "2026-10-20T01:00:00Z"}}))
      .toEqual({clientId: "999.1792486200", sessionId: 1792486200});
  });
  it("keeps click identifiers when the marketing choice is made again", () => {
    browserAttribution(base);
    expect(browserAttribution({...base, search: "", random: () => 999,
      consent: {...consent, updatedAt: "2026-10-20T01:00:00Z"}}))
      .toMatchObject({clientId: "999.1792486200", gclid: "SyntheticGoogle123", fbclid: "SyntheticMeta123"});
  });
  it("fails closed on unavailable storage or malformed identifiers", () => {
    expect(browserAttribution({...base, storage: {getItem() {throw new Error("denied");}, setItem() {}, removeItem() {}}})).toBeNull();
    expect(safeBrowserAttribution({clientId: "person@example.test", sessionId: now}, true)).toBeNull();
    expect(safeBrowserAttribution({clientId: "123.1792486200", sessionId: 1792486200,
      gclid: "https://private.test", email: "secret@example.test"}, true))
      .toEqual({clientId: "123.1792486200", sessionId: 1792486200});
  });
});
