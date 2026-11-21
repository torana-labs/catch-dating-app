import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import * as narrow from "./publicValidators.mjs";
import * as repository from "../../../tool/contracts/generated/schema_contract_validators.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL(`../../../contracts/fixtures/${name}`, import.meta.url), "utf8"));

test("webpack's runtime validator replacement compiles only the public read models", () => {
  assert.deepEqual(Object.keys(narrow).sort(), [
    "validateCityPlansDocument", "validateEventPublicPageDocument", "validateOrganizerPublicPageDocument",
  ]);
});
test("webpack's runtime validator replacement validates the public page read models", () => {
  for (const [name, key] of [["organizer_public_page_doc", "validateOrganizerPublicPageDocument"],
    ["event_public_page_doc", "validateEventPublicPageDocument"],
    ["city_plans_doc", "validateCityPlansDocument"]]) {
    const valid = fixture(`valid/${name}.json`);
    assert.equal(narrow[key](valid), true);
    for (const value of [valid, {...valid, schemaVersion: 2}, {...valid, privateToken: "no"}, null]) {
      assert.equal(narrow[key](value), repository[key](value));
    }
  }
  assert.equal(narrow.validateEventPublicPageDocument(fixture("invalid/event_public_page_doc_balanced_label.json")), false);
  assert.equal(narrow.validateOrganizerPublicPageDocument(fixture("invalid/organizer_public_page_doc_contact_field.json")), false);
  assert.equal(narrow.validateCityPlansDocument(fixture("invalid/city_plans_doc_contact_field.json")), false);
});
test("webpack's runtime validator replacement exports every validator the server imports", () => {
  for (const file of ["repositories/publicPageRepository.ts"]) {
    const source = readFileSync(new URL(`../../src/server/${file}`, import.meta.url), "utf8");
    const imports = source.match(/import\s*\{([^}]*)\}\s*from\s*"[^"]*schema_contract_validators\.mjs"/u);
    assert(imports, `${file} imports the generated validators`);
    for (const name of imports[1].split(",").map((part) => part.trim()).filter(Boolean)) {
      assert.equal(typeof narrow[name], "function", `${file} imports ${name}, which publicValidators.mjs must export`);
    }
  }
});
