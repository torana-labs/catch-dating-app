import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {organizerFormEmbedAssets} from "./organizerFormEmbed";
import {BRAND} from "../shared/generated/brand";

describe("form embed installer", () => {
  it("retains the canonical direct link and escapes form titles", () => {
    const result = organizerFormEmbedAssets(
      `${BRAND.web.origin}/f/public-1/`,
      "<img src=x onerror=\"evil()\">", "embed-1"
    );
    assert.match(result.embedUrl, /[?&]embed=1/u);
    assert.match(result.embedSnippet, /Open the form directly/u);
    assert.ok(result.embedSnippet.includes(
      `href="${BRAND.web.origin}/f/public-1/"`));
    assert.doesNotMatch(result.embedSnippet, /<img/u);
  });

  it("loads an external installer for restrictive parent CSP", () => {
    const {embedSnippet} = organizerFormEmbedAssets(
      `${BRAND.web.origin}/f/public-1/`, "Application", "embed-1"
    );
    assert.ok(embedSnippet.includes(
      `src="${BRAND.web.origin}/form-embed-resize.js"`));
    assert.doesNotMatch(embedSnippet, /<script>/u);
  });
});
