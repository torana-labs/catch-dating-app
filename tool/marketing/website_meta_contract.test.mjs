import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {fromRepo} from "../lib/repo_paths.mjs";
import {
  formatContentTemplate,
  readWebsiteMeta,
  staticRouteMeta,
  validateWebsiteMeta,
} from "./website_meta_contract.mjs";
import {brand} from "@catch/brand";

const canonicalMetaPath = fromRepo("website/src/content/meta.json");
const metaSchemaPath = fromRepo("website/src/content/meta.schema.json");
const canonicalContent = JSON.parse(fs.readFileSync(canonicalMetaPath, "utf8"));
const validateSchema = new Ajv2020({allErrors: true}).compile(
  JSON.parse(fs.readFileSync(metaSchemaPath, "utf8"))
);

test("canonical website metadata satisfies the runtime content contract", () => {
  const content = readWebsiteMeta(canonicalMetaPath);

  assert.deepEqual(validateWebsiteMeta(content), []);
  assert.deepEqual(staticRouteMeta(content, "host", `${brand.web.origin}/`), {
    ...content.routes.host,
    canonical: `${brand.web.origin}/host/`,
  });
  assert.equal(
    formatContentTemplate(content.listing.titleTemplate, {
      name: "AFTER FLY",
      city: "Indore",
    }),
    "AFTER FLY | Indore events & reviews | Catch"
  );
});

test("metadata validation rejects missing template tokens and unsupported fields", () => {
  const content = JSON.parse(fs.readFileSync(canonicalMetaPath, "utf8"));
  content.listing.titleTemplate = "{name} organizer profile | Catch";
  content.routes.home.unownedField = "drift";

  assert.match(validateWebsiteMeta(content).join("\n"), /must contain \{city\}/u);
  assert.match(validateWebsiteMeta(content).join("\n"), /unsupported key unownedField/u);
});

test("JSON schema and browser runtime validator agree on valid and invalid fixtures", () => {
  assert.equal(validateSchema(canonicalContent), true, JSON.stringify(validateSchema.errors));
  assert.deepEqual(validateWebsiteMeta(canonicalContent), []);

  const invalidFixtures = [
    (value) => {
      value.$schema = "./wrong.schema.json";
    },
    (value) => {
      delete value.routes.home.title;
    },
    (value) => {
      value.routes.host.canonicalPath = "host";
    },
    (value) => {
      value.routes.home.robots = "index, follow";
    },
    (value) => {
      value.routes.home.unownedField = "drift";
    },
    (value) => {
      value.listing.titleTemplate = "{name} profile";
    },
    (value) => {
      value.listing.staticLabels.sourcesHeading = "";
    },
  ];

  for (const mutate of invalidFixtures) {
    const fixture = structuredClone(canonicalContent);
    mutate(fixture);
    assert.equal(validateSchema(fixture), false, "JSON schema accepted invalid fixture");
    assert.notDeepEqual(
      validateWebsiteMeta(fixture),
      [],
      "browser runtime validator accepted invalid fixture"
    );
  }
});

test("metadata reader reports invalid content with its source path", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-website-meta-"));
  const invalidPath = path.join(tmpRoot, "meta.json");
  fs.writeFileSync(invalidPath, '{"routes":{}}\n');

  assert.throws(
    () => readWebsiteMeta(invalidPath),
    new RegExp(`Website metadata validation failed at ${escapeRegExp(invalidPath)}`, "u")
  );
});

test("content templates reject missing values", () => {
  assert.throws(
    () => formatContentTemplate("{name} in {market}", {name: "Catch"}),
    /Invalid content template values \(missing: market\)/u
  );
  assert.throws(
    () => formatContentTemplate("{name}", {name: "Catch", city: "Mumbai"}),
    /Invalid content template values \(extra: city\)/u
  );
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
