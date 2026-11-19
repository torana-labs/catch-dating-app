import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {checkCommandCatalog} from "../scripts/check-command-catalog.mjs";
import {EFFECT_CONFIRMATION_POLICY} from "../src/command-client/confirmation-policy.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const catalogFile = path.join(repoRoot, "contracts/commands/catalog.json");

async function variant(mutate) {
  const catalog = JSON.parse(await fs.readFile(catalogFile, "utf8"));
  mutate(catalog);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "command-catalog-"));
  const target = path.join(directory, "catalog.json");
  await fs.writeFile(target, JSON.stringify(catalog));
  return target;
}

test("the command catalog passes client parity", async () => {
  const result = await checkCommandCatalog({repoRoot});
  assert.deepEqual(result.findings, []);
  assert.ok(result.commands >= 1);
});

test("every catalog effect class has a client confirmation policy", async () => {
  const catalog = JSON.parse(await fs.readFile(catalogFile, "utf8"));
  assert.deepEqual(Object.keys(catalog.effectClasses).sort(),
    Object.keys(EFFECT_CONFIRMATION_POLICY).sort());
});

test("parity fails for an effect class clients cannot confirm", async () => {
  const catalogPath = await variant((catalog) => {
    catalog.effectClasses["deletes-account"] = "Deletes the account.";
    catalog.commands[0].effect = "deletes-account";
  });
  const result = await checkCommandCatalog({repoRoot, catalogPath});
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) =>
    finding.id === "effect-class-without-client-policy"));
});

test("parity fails for an unknown surface or a duplicate command", async () => {
  const catalogPath = await variant((catalog) => {
    catalog.commands[0].surfaces = [...catalog.commands[0].surfaces, "fax"];
    catalog.commands.push({...catalog.commands[0]});
  });
  const result = await checkCommandCatalog({repoRoot, catalogPath});
  const ids = result.findings.map((finding) => finding.id);
  assert.ok(ids.includes("unknown-surface"));
  assert.ok(ids.includes("duplicate-command"));
});
