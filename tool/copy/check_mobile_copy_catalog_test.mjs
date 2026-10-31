#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  catalogRows,
  validateMobileCopyCatalog,
} from "./check_mobile_copy_catalog.mjs";

const valid = {
  "@@locale": "en",
  greeting: "Hello",
  "@greeting": {
    description: "Greeting",
    "x-audience": "shared",
    "x-owner": "marketing",
    "x-surface": "startup",
    "x-max-chars": 20,
  },
};

assert.deepEqual(validateMobileCopyCatalog(valid), []);
assert.equal(catalogRows(valid)[0].key, "greeting");

const invalid = structuredClone(valid);
delete invalid["@greeting"]["x-owner"];
assert.ok(
  validateMobileCopyCatalog(invalid).some((error) => error.includes("x-owner")),
);

const identifierShaped = structuredClone(valid);
identifierShaped.hostsExampleVisiblecopyOrganizerid = "organizerId";
identifierShaped["@hostsExampleVisiblecopyOrganizerid"] = {
  description: "Identifier accidentally migrated into visible copy.",
  "x-audience": "host",
  "x-owner": "engineering",
  "x-surface": "host example",
};
assert.ok(
  validateMobileCopyCatalog(identifierShaped).some((error) =>
    error.includes("identifier-shaped Visiblecopy")
  ),
);
assert.deepEqual(
  validateMobileCopyCatalog(identifierShaped, {
    identifierAllowlist: new Set(["hostsExampleVisiblecopyOrganizerid"]),
  }),
  [],
);

console.log("Mobile copy catalog checks passed.");
