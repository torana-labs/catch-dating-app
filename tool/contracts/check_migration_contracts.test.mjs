import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkMigrationContracts} from "./check_migration_contracts.mjs";

test("migration contract check validates the current migration inventory", () => {
  const result = checkMigrationContracts();
  assert.deepEqual(result.errors, []);
  assert.equal(result.migrationCount, 3);
  assert.equal(result.phaseCount, 19);
});

test("migration contract check rejects incomplete complete-state evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-migrations-"));
  fs.mkdirSync(path.join(root, "contracts/migrations"), {recursive: true});
  fs.writeFileSync(
    path.join(root, "contracts/migrations/broken.json"),
    JSON.stringify({
      schemaVersion: 1,
      logicalName: "brokenMigration",
      currentPhase: "cleanup_complete",
      reason: "This contract is intentionally invalid for checker coverage.",
      phases: [
        {
          id: "cleanup",
          status: "pending",
          description: "Pending cleanup proves complete currentPhase is rejected.",
        },
        {
          id: "cleanup",
          status: "complete_remote",
          description: "Duplicate id and missing liveApply are both rejected.",
        },
      ],
      guards: ["A guard exists so only phase evidence errors remain."],
    }),
  );

  const result = checkMigrationContracts({root});
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate phase id "cleanup"/);
  assert.match(result.errors.join("\n"), /currentPhase cleanup_complete/);
  assert.match(result.errors.join("\n"), /complete_remote phases require/);
});
