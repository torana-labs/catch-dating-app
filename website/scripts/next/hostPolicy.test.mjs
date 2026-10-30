import assert from "node:assert/strict";
import test from "node:test";
import {requestHostname, websiteRequestHostname, isCatchWebsiteHost, isCatchIndexingHost} from "../../src/app/surfaceHostPolicy.ts";
import {brand} from "@catch/brand";

test("Host parsing does not grant unknown/custom tenants a marketing surface", () => {
  assert.equal(requestHostname("forms.client.example:3107"), "forms.client.example");
  assert.equal(isCatchWebsiteHost(requestHostname("forms.client.example:3107")), false);
  assert.equal(isCatchWebsiteHost(requestHostname(`${brand.web.domain}:443`)), true);
  assert.equal(isCatchWebsiteHost(requestHostname(brand.web.domain.toUpperCase())), true);
  assert.equal(isCatchWebsiteHost(requestHostname("catchdates-dev--preview.web.app")), true);
  assert.equal(isCatchWebsiteHost(requestHostname("unknown.web.app")), false);
  for (const bad of [null, "", `${brand.web.domain}@evil.example`, `${brand.web.domain}/`, `${brand.web.domain}#evil`, `${brand.web.domain} evil`, `${brand.web.domain}\\evil`]) {
    assert.equal(requestHostname(bad), null);
  }
});

test("production images still deny indexing on preview, default and custom hosts", () => {
  for (const host of [brand.web.domain, new URL(brand.web.wwwOrigin).hostname]) assert.equal(isCatchIndexingHost(host), true);
  for (const host of [null, "localhost", "catch-dating-app-64e51.web.app", "catch-dating-app-64e51--next-release-abc.web.app", "forms.client.example", `${brand.web.domain}.evil.example`]) assert.equal(isCatchIndexingHost(host), false);
});

test("Hosting forwarding selects only a public origin on the two website runtimes", () => {
  for (const service of ["catch-website-next", "catch-website-next-preview"]) {
    for (const host of [`${service}-r5gx7bekta-el.a.run.app`, `fh-test---${service}-r5gx7bekta-el.a.run.app`,
      `${service}-123456.asia-south1.run.app`]) {
      for (const origin of [brand.web.domain, "catch-dating-app-64e51--next-candidate-proof.web.app"]) {
        const headers = new Headers({host, "x-forwarded-host": origin});
        assert.equal(websiteRequestHostname(headers, service), origin);
        assert.equal(isCatchIndexingHost(websiteRequestHostname(headers, service)), origin === brand.web.domain);
        assert.equal(websiteRequestHostname(headers), host);
        assert.equal(websiteRequestHostname(headers, "unrelated-service"), host);
      }
      for (const origin of ["forms.client.example", "localhost", "127.0.0.1", `${brand.web.domain}.evil.example`,
        `${brand.web.domain},evil.example`, `${brand.web.domain}@evil.example`, brand.web.origin, `${brand.web.domain}/path`]) {
        assert.equal(websiteRequestHostname(new Headers({host, "x-forwarded-host": origin}), service), host);
      }
      assert.equal(websiteRequestHostname(new Headers({host}), service), host);
    }
  }
  for (const host of ["localhost:3109", "forms.client.example", "unrelated.a.run.app",
    "catch-website-next-123XrunXapp", "catch-website-next-123.run.app.evil.example"]) {
    assert.equal(websiteRequestHostname(new Headers({host, "x-forwarded-host": brand.web.domain}), "catch-website-next"), requestHostname(host));
  }
});
