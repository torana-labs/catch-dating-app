import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  validateWebsiteHostListingProjection,
} from "../../tool/contracts/generated/schema_contract_validators.mjs";

import "./organizerListingReadiness.test.mjs";

const scriptPath = fileURLToPath(new URL("./generateOrganizerListings.mjs", import.meta.url));

test("listing schema rejects stale publication and review target contradictions", () => {
  const listing = JSON.parse(fs.readFileSync(
    fileURLToPath(new URL("../src/generated/hostListings.json", import.meta.url)),
    "utf8"
  ))[0];
  assert.equal(validateWebsiteHostListingProjection(listing), true);

  const staleSuppression = structuredClone(listing);
  staleSuppression.authority.publishStatus = "published";
  staleSuppression.authority.claimState = "suppressed";
  assert.equal(validateWebsiteHostListingProjection(staleSuppression), false);

  const staleReviewCapability = structuredClone(listing);
  staleReviewCapability.capabilities.publicReviews.targetState = "disabled";
  staleReviewCapability.capabilities.publicReviews.readState = "enabled";
  assert.equal(validateWebsiteHostListingProjection(staleReviewCapability), false);
});

test("production output excludes demo listings while explicit story output includes them", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-organizer-demo-split-"));
  const productionPath = path.join(tmpRoot, "hostListings.json");
  const storyPath = path.join(tmpRoot, "hostListings.demo.json");

  execFileSync(process.execPath, [scriptPath, "--output", productionPath], {
    stdio: "pipe",
  });
  execFileSync(process.execPath, [
    scriptPath,
    "--include-demo",
    "--output",
    storyPath,
  ], {stdio: "pipe"});

  const productionListings = JSON.parse(fs.readFileSync(productionPath, "utf8"));
  const storyListings = JSON.parse(fs.readFileSync(storyPath, "utf8"));
  assert.equal(productionListings.some((listing) => listing.catchEvents?.length), false);
  assert.equal(
    productionListings.some((listing) => listing.dataOrigin === "catchDemo"),
    false
  );
  assert.equal(
    productionListings.some((listing) => listing.id === "bhag"),
    false,
    "waitlist-market organizer listings must not enter the deployable projection"
  );
  assert.equal(
    storyListings.some((listing) => listing.dataOrigin === "catchDemo"),
    true
  );
  assert.equal(storyListings.some((listing) => listing.dataOrigin === "catchDemo"), true);
});

test("check mode validates committed projections offline", (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-organizer-check-"));
  t.after(() => fs.rmSync(tmpRoot, {recursive: true, force: true}));
  const generated = fileURLToPath(new URL("../src/generated/", import.meta.url));
  const production = path.join(tmpRoot, "hostListings.json");
  const story = path.join(tmpRoot, "hostListings.demo.json");
  fs.copyFileSync(path.join(generated, "hostListings.json"), production);
  fs.copyFileSync(path.join(generated, "hostListings.demo.json"), story);

  execFileSync(process.execPath, [scriptPath, "--check", "--output", production],
    {stdio: "pipe"});
  execFileSync(process.execPath, [scriptPath, "--check", "--include-demo",
    "--output", story], {stdio: "pipe"});

  const storyListings = JSON.parse(fs.readFileSync(story, "utf8"));
  fs.writeFileSync(production, `${JSON.stringify(storyListings, null, 2)}\n`);
  assert.throws(() => execFileSync(process.execPath, [scriptPath, "--check",
    "--output", production], {stdio: "pipe"}), /must not/u);
});

test("retired repo-JSON projection inputs are rejected", () => {
  const help = execFileSync(process.execPath, [scriptPath, "--help"],
    {encoding: "utf8"});
  for (const flag of ["--projection-plan", "--external-event-readiness",
    "--claim-target-sync-preview", "--claim-target-plan",
    "--claim-target-readiness-receipt"]) {
    assert.equal(help.includes(flag), false, flag);
  }
  assert.throws(() => execFileSync(process.execPath, [scriptPath,
    "--projection-plan", "unused.json"], {stdio: "pipe"}), /Unknown argument/u);
  assert.throws(() => execFileSync(process.execPath, [scriptPath,
    "--readiness-receipt", "unused.json"], {stdio: "pipe"}),
  /requires a current --firestore-project/u);
});
