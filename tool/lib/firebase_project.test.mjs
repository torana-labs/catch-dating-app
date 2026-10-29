import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  isFirebaseProductionTarget,
  resolveFirebaseProjectId,
} from "./firebase_project.mjs";

test("resolveFirebaseProjectId reads project aliases from .firebaserc", () => {
  const firebaseRcPath = writeFirebaseRc({
    dev: "catchdates-dev",
    staging: "catchdates-staging",
    prod: "catch-dating-app-64e51",
  });

  assert.equal(
    resolveFirebaseProjectId({env: "dev", firebaseRcPath}),
    "catchdates-dev"
  );
  assert.equal(
    resolveFirebaseProjectId({env: "staging", firebaseRcPath}),
    "catchdates-staging"
  );
  assert.equal(
    resolveFirebaseProjectId({env: "prod", firebaseRcPath}),
    "catch-dating-app-64e51"
  );
});

test("resolveFirebaseProjectId preserves explicit project override", () => {
  const firebaseRcPath = writeFirebaseRc({dev: "catchdates-dev"});

  assert.equal(
    resolveFirebaseProjectId({
      project: "custom-project",
      env: "dev",
      firebaseRcPath,
    }),
    "custom-project"
  );
});

test("isFirebaseProductionTarget uses the prod alias, not string matching", () => {
  const firebaseRcPath = writeFirebaseRc({
    dev: "catchdates-dev",
    prod: "catch-dating-app-64e51",
  });

  assert.equal(
    isFirebaseProductionTarget({
      env: "dev",
      projectId: "catchdates-dev",
      firebaseRcPath,
    }),
    false
  );
  assert.equal(
    isFirebaseProductionTarget({
      env: "prod",
      projectId: "catch-dating-app-64e51",
      firebaseRcPath,
    }),
    true
  );
  assert.equal(
    isFirebaseProductionTarget({
      projectId: "catch-dating-app-64e51",
      firebaseRcPath,
    }),
    true
  );
});

function writeFirebaseRc(projects) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firebaserc-"));
  const firebaseRcPath = path.join(dir, ".firebaserc");
  fs.writeFileSync(
    firebaseRcPath,
    JSON.stringify({projects}, null, 2),
    "utf8"
  );
  return firebaseRcPath;
}
