import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {resolvePublicFormDomainRequest} from "./formDomainHttp";
import {BRAND} from "../shared/generated/brand";

describe("public custom-domain resolution", () => {
  it("validates the host lookup and returns public routing", async () => {
    const lookedUp: string[] = [];
    const resolve = async (host: string) => {
      lookedUp.push(host);
      return host === "apply.example-club.example" ? "public-a" : null;
    };
    assert.deepEqual(await resolvePublicFormDomainRequest(
      "GET", "apply.example-club.example", resolve), {
      status: 200, body: {hostname: "apply.example-club.example",
        publicFormId: "public-a"},
    });
    assert.deepEqual(await resolvePublicFormDomainRequest(
      "GET", "apply.example-club.example:443", resolve), {
      status: 404, body: {error: "Form unavailable"},
    });
    assert.deepEqual(await resolvePublicFormDomainRequest(
      "GET", `app.${BRAND.web.domain}`, resolve), {
      status: 404, body: {error: "Form unavailable"},
    });
    assert.deepEqual(await resolvePublicFormDomainRequest(
      "POST", "apply.example-club.example", resolve), {
      status: 405, body: {error: "Method not allowed"},
    });
    assert.deepEqual(lookedUp, ["apply.example-club.example"]);
  });
});
