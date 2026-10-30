import {afterEach, expect, it, vi} from "vitest";
import {formProfileReviewUrl} from "./formProfileReviewLink";
import {brand} from "@catch/brand";

afterEach(() => vi.unstubAllEnvs());
it("does not send development identities into production", () => {
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "catchdates-dev");
  vi.stubEnv("VITE_CONSUMER_APP_URL", "");
  expect(formProfileReviewUrl("response")).toBeNull();
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "catch-dating-app-64e51");
  expect(formProfileReviewUrl("response")).toBe(`${brand.web.appOrigin}/#/you/forms/response`);
});
it("supports a build-configured local consumer and encodes only the response ID", () => {
  vi.stubEnv("VITE_CONSUMER_APP_URL", "http://127.0.0.1:8765");
  expect(formProfileReviewUrl("r/with?reserved#chars"))
    .toBe("http://127.0.0.1:8765/#/you/forms/r%2Fwith%3Freserved%23chars");
});
it.each(["javascript:alert(1)", "http://example.test", "https://user:pass@example.test",
  "https://example.test/path", "https://example.test?token=secret", "https://example.test/#redirect"])(
  "rejects unsafe or ambiguous destinations: %s", (url) => {
    vi.stubEnv("VITE_CONSUMER_APP_URL", url);
    expect(formProfileReviewUrl("response")).toBeNull();
  });
