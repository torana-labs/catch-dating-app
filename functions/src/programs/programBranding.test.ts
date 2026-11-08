import assert from "node:assert/strict";
import test from "node:test";
import {programGuestBranding, programGuestBrandingField} from
  "./programBranding";

test("branding reads only a known colour, a branding-folder cover and a credit",
  () => {
    assert.equal(programGuestBranding({}), null);
    assert.equal(programGuestBranding({branding: null}), null);
    assert.equal(programGuestBranding({branding: {color: "teal"}}), null);
    assert.deepEqual(programGuestBranding({branding: {color: "rose",
      coverImagePath: "programs/p-1/branding/cover.jpg", creditLine: "  "}}),
    {color: "rose", coverImagePath: "programs/p-1/branding/cover.jpg",
      creditLine: null});
    assert.deepEqual(programGuestBranding({branding: {color: "haldi",
      coverImagePath: "users/u/cover.jpg", creditLine: "Meher"}}),
    {color: "haldi", coverImagePath: null, creditLine: "Meher"});
    assert.deepEqual(programGuestBrandingField({}), {});
  });
