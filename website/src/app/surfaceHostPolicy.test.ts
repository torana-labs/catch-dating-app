import {expect, it} from "vitest";
import {canonicalProductionRedirect} from "./surfaceHostPolicy";
import {brand} from "@catch/brand";

it(`sends the production Firebase hosts to ${brand.web.domain}, keeping the path and query`, () => {
  expect(canonicalProductionRedirect("catch-dating-app-64e51.web.app", "/organizers/mumbai/afterfly/", "?ref=ig", true))
    .toBe(`${brand.web.origin}/organizers/mumbai/afterfly/?ref=ig`);
  expect(canonicalProductionRedirect("catch-dating-app-64e51.firebaseapp.com", "/", "", true))
    .toBe(`${brand.web.origin}/`);
});

it("leaves Firebase Auth handlers, API calls, previews, other hosts and non-production runtimes alone", () => {
  expect(canonicalProductionRedirect("catch-dating-app-64e51.firebaseapp.com", "/__/auth/handler", "", true)).toBeNull();
  expect(canonicalProductionRedirect("catch-dating-app-64e51.web.app", "/api/join-waitlist", "", true)).toBeNull();
  expect(canonicalProductionRedirect("catch-dating-app-64e51--next-candidate-tnpxnhes.web.app", "/", "", true)).toBeNull();
  expect(canonicalProductionRedirect(brand.web.domain, "/", "", true)).toBeNull();
  expect(canonicalProductionRedirect("catchdates-dev.web.app", "/", "", true)).toBeNull();
  expect(canonicalProductionRedirect(null, "/", "", true)).toBeNull();
  expect(canonicalProductionRedirect("catch-dating-app-64e51.web.app", "/", "", false)).toBeNull();
});
