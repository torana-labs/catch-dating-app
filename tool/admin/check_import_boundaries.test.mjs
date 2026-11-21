import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {isFirestoreSdkSpecifier, scanAdminImportBoundaries} from "./check_import_boundaries.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "admin-import-boundaries-"));
  t.after(() => fs.rmSync(root, {force: true, recursive: true}));
  for (const directory of ["callables", "callable_responses", "operations"]) {
    fs.mkdirSync(path.join(root, "contracts", directory), {recursive: true});
  }
  fs.mkdirSync(path.join(root, "admin/src"), {recursive: true});
  return {
    root,
    write(relativePath, contents = "export {};\n") {
      const absolutePath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
      fs.writeFileSync(absolutePath, contents);
      return absolutePath;
    },
  };
}

function importPath(sourcePath, targetPath) {
  const relativePath = path.relative(path.dirname(sourcePath), targetPath)
    .split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function importing(...specifiers) {
  return specifiers.map((specifier, index) =>
    `import schema${index} from "${specifier}";`).join("\n");
}

test("feature API modules may import direct canonical browser contract schemas", (t) => {
  const files = fixture(t);
  const source = files.write("admin/src/features/partners/api/parsers/response.ts");
  const schemas = [
    files.write("contracts/callables/request.schema.json", "{}\n"),
    files.write("contracts/callable_responses/response.schema.json", "{}\n"),
    files.write("contracts/operations/artifact.schema.json", "{}\n"),
  ];
  fs.writeFileSync(source, importing(...schemas.map((schema) => importPath(source, schema))));

  assert.deepEqual(scanAdminImportBoundaries(files.root), []);
});

test("UI and controller modules cannot import contract schemas directly", (t) => {
  const files = fixture(t);
  const schema = files.write("contracts/callable_responses/response.schema.json", "{}\n");
  for (const layer of ["ui", "controllers"]) {
    const source = files.write(`admin/src/features/partners/${layer}/consumer.ts`);
    fs.writeFileSync(source, importing(importPath(source, schema)));
  }

  const violations = scanAdminImportBoundaries(files.root);
  assert.equal(violations.length, 2);
  assert.ok(violations.every((violation) =>
    violation.reason === "relative import leaves admin/src without an explicit allowlist"));
});

test("feature APIs reject fixtures, snapshots, arbitrary JSON, and other schema families", (t) => {
  const files = fixture(t);
  const source = files.write("admin/src/features/partners/api/response.ts");
  const rejected = [
    files.write("contracts/operations/fixtures/valid/run.schema.json", "{}\n"),
    files.write("contracts/operations/current.snapshot.json", "{}\n"),
    files.write("contracts/operations/run.json", "{}\n"),
    files.write("contracts/firestore/user.schema.json", "{}\n"),
  ];
  fs.writeFileSync(source, importing(...rejected.map((target) => importPath(source, target))));

  assert.equal(scanAdminImportBoundaries(files.root).length, rejected.length);
});

test("a schema-shaped symlink cannot escape a canonical contract directory", (t) => {
  const files = fixture(t);
  const source = files.write("admin/src/features/partners/api/response.ts");
  const snapshot = files.write("private/snapshot.json", "{}\n");
  const symlink = path.join(files.root, "contracts/operations/escaped.schema.json");
  fs.symlinkSync(snapshot, symlink);
  fs.writeFileSync(source, importing(importPath(source, symlink)));

  assert.equal(scanAdminImportBoundaries(files.root).length, 1);
});

test("an external alias to a canonical schema is not a canonical import path", (t) => {
  const files = fixture(t);
  const source = files.write("admin/src/features/partners/api/response.ts");
  const schema = files.write("contracts/operations/run.schema.json", "{}\n");
  const alias = path.join(files.root, "private/alias.schema.json");
  fs.mkdirSync(path.dirname(alias), {recursive: true});
  fs.symlinkSync(schema, alias);
  fs.writeFileSync(source, importing(importPath(source, alias)));

  assert.equal(scanAdminImportBoundaries(files.root).length, 1);
});

test("a symlinked contract root cannot make private schemas canonical", (t) => {
  const files = fixture(t);
  const source = files.write("admin/src/features/partners/api/response.ts");
  const privateRoot = path.join(files.root, "private/operations");
  const privateSchema = files.write("private/operations/run.schema.json", "{}\n");
  const operationsRoot = path.join(files.root, "contracts/operations");
  fs.rmSync(operationsRoot, {recursive: true});
  fs.symlinkSync(privateRoot, operationsRoot);
  fs.writeFileSync(source, importing(importPath(
    source,
    path.join(operationsRoot, path.basename(privateSchema))
  )));

  assert.equal(scanAdminImportBoundaries(files.root).length, 1);
});

test("existing feature and external escape boundaries remain enforced", (t) => {
  const files = fixture(t);
  const otherFeature = files.write("admin/src/features/sales/api/repository.ts");
  const featureSource = files.write("admin/src/features/partners/api/repository.ts");
  const arbitraryExternal = files.write("private/config.ts");
  fs.writeFileSync(featureSource, importing(
    importPath(featureSource, otherFeature),
    importPath(featureSource, arbitraryExternal),
  ));

  const violations = scanAdminImportBoundaries(files.root);
  assert.equal(violations.length, 2);
  assert.match(violations[0].reason, /must not import feature 'sales'/u);
  assert.equal(
    violations[1].reason,
    "relative import leaves admin/src without an explicit allowlist"
  );
});

test("shared contract generated-type allowance remains narrow", (t) => {
  const files = fixture(t);
  const generated = files.write("functions/src/shared/generated/value.ts");
  const contractSource = files.write("admin/src/shared/contracts/value.ts");
  const sharedApiSource = files.write("admin/src/shared/api/value.ts");
  fs.writeFileSync(contractSource, importing(importPath(contractSource, generated)));
  fs.writeFileSync(sharedApiSource, importing(importPath(sharedApiSource, generated)));

  assert.deepEqual(scanAdminImportBoundaries(files.root), [{
    source: "shared/api/value.ts",
    specifier: importPath(sharedApiSource, generated),
    reason: "relative import leaves admin/src without an explicit allowlist",
  }]);
});

test("web-ui imports use the package or a subpath it exports, never a deep path", (t) => {
  const files = fixture(t);
  files.write("packages/web-ui/package.json", JSON.stringify({exports: {".": {}, "./phone": {}}}));
  const source = files.write("admin/src/app/value.ts", importing(
    "@catch/web-ui", "@catch/web-ui/phone", "@catch/web-ui/src/components/CatchField"));

  assert.deepEqual(scanAdminImportBoundaries(files.root), [{
    source: "app/value.ts",
    specifier: "@catch/web-ui/src/components/CatchField",
    reason: "shared web UI must be imported from @catch/web-ui or a subpath it exports, without deep imports",
  }]);
});

test("Admin never imports the Firestore SDK, browser or Admin, in any form", (t) => {
  const files = fixture(t);
  files.write("admin/src/features/partners/api/repository.ts", [
    "import {getFirestore} from \"firebase/firestore\";",
    "import {getDocs} from \"firebase/firestore/lite\";",
    "import type {Firestore} from \"@firebase/firestore\";",
    "export {doc} from \"firebase/firestore\";",
    "const admin = await import(\"firebase-admin/firestore\");",
    "const compat = require(\"firebase/compat/firestore\");",
  ].join("\n"));
  files.write("admin/.storybook/preview.ts", "import \"firebase-admin\";\n");

  const violations = scanAdminImportBoundaries(files.root);
  assert.deepEqual(violations.map((violation) => violation.specifier).sort(), [
    "@firebase/firestore",
    "firebase-admin",
    "firebase-admin/firestore",
    "firebase/compat/firestore",
    "firebase/firestore",
    "firebase/firestore",
    "firebase/firestore/lite",
  ]);
  assert.ok(violations.every((violation) => /must not use the Firestore SDK/u.test(violation.reason)));
  assert.ok(violations.some((violation) => violation.source === ".storybook/preview.ts"));
});

test("other Firebase browser SDK modules stay allowed", (t) => {
  const files = fixture(t);
  files.write("admin/src/shared/firebase/client.ts", [
    "import {initializeApp} from \"firebase/app\";",
    "import {getAuth} from \"firebase/auth\";",
    "import {getFunctions} from \"firebase/functions\";",
    "import {firestoreLabel} from \"./firestoreLabel\";",
  ].join("\n"));
  files.write("admin/src/shared/firebase/firestoreLabel.ts");

  assert.deepEqual(scanAdminImportBoundaries(files.root), []);
});

test("isFirestoreSdkSpecifier matches packages and subpaths, not look-alikes", () => {
  assert.equal(isFirestoreSdkSpecifier("firebase/firestore"), true);
  assert.equal(isFirestoreSdkSpecifier("firebase-admin/app"), true);
  assert.equal(isFirestoreSdkSpecifier("firebase/firestore-helpers"), false);
  assert.equal(isFirestoreSdkSpecifier("firebase-administration"), false);
});
