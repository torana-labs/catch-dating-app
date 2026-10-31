import "./profile_requirements.test.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import test from "node:test";
import * as canonical from "./generated/schema_contract_registry.mjs";
import {
  boundFieldConstraints,
  functionsRuntimeModules,
  publishSchemaOutputs,
} from "./generate_schema_contracts.mjs";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url)
);
const ts = requireFromFunctions("typescript");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("modular Functions schemas match their canonical schema and catalog values", () => {
  const actual = {};
  for (const directory of ["schemas", "catalogs"]) {
    const folder = path.join(root, "functions/src/shared/generated", directory);
    for (const filename of fs.readdirSync(folder)) {
      assert.ok(filename.endsWith(".ts"), `Unexpected generated file: ${filename}`);
      const source = ts.createSourceFile(filename, fs.readFileSync(path.join(folder, filename), "utf8"), ts.ScriptTarget.Latest, true);
      assert.equal(source.parseDiagnostics.length, 0);
      assert.equal(source.statements.length, 1, `Expected one isolated export: ${filename}`);
      const statement = source.statements[0];
      assert.ok(ts.isVariableStatement(statement));
      assert.equal(statement.declarationList.declarations.length, 1);
      const declaration = statement.declarationList.declarations[0];
      const name = declaration.name.getText(source);
      assert.ok(!Object.hasOwn(actual, name), `Duplicate generated export: ${name}`);
      const expression = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer;
      actual[name] = JSON.parse(expression.getText(source));
    }
  }
  const declared = JSON.parse(fs.readFileSync(
    path.join(root, "contracts/functions/runtime_modules.json"), "utf8"));
  const expectedSchemas = declared.validators.map((name) =>
    `${name.charAt(0).toLowerCase()}${name.slice(1)}Schema`);
  const emittedSchemas = Object.keys(actual).filter((name) =>
    name.endsWith("Schema") && Object.hasOwn(canonical, name));
  assert.deepEqual(emittedSchemas.sort(), expectedSchemas.sort(),
    "Functions schema modules must be exactly the declared runtime validators");
  for (const [name, value] of Object.entries(actual)) {
    assert.ok(Object.hasOwn(canonical, name), `Unknown generated export: ${name}`);
    assert.deepEqual(value, canonical[name], `Schema/catalog semantics drifted: ${name}`);
  }
});

test("declared Functions runtime modules are imported by runtime code", () => {
  const declared = JSON.parse(fs.readFileSync(
    path.join(root, "contracts/functions/runtime_modules.json"), "utf8"));
  const generated = path.join(root, "functions/src/shared/generated");
  const moduleOf = new Map();
  for (const directory of ["validators", "schemas"]) {
    for (const file of fs.readdirSync(path.join(generated, directory))) {
      const source = fs.readFileSync(path.join(generated, directory, file), "utf8");
      const match = source.match(/export const (?:validate(\w+)|(\w+)Schema)\b/);
      const name = match[1] ?? `${match[2][0].toUpperCase()}${match[2].slice(1)}`;
      moduleOf.set(`${directory}:${name}`, path.join(generated, directory, file));
    }
  }
  for (const file of fs.readdirSync(generated)) {
    if (!file.endsWith(".ts")) continue;
    const source = fs.readFileSync(path.join(generated, file), "utf8");
    for (const match of source.matchAll(/^export (?:interface|type) (\w+)\b/gm)) {
      if (!moduleOf.has(`types:${match[1]}`)) {
        moduleOf.set(`types:${match[1]}`, path.join(generated, file));
      }
    }
  }
  const imported = new Set();
  const runtimeSources = (directory) => fs.existsSync(directory) ?
    fs.readdirSync(directory, {recursive: true})
      .map((file) => path.join(directory, file))
      .filter((file) => /\.(tsx?|cjs|mjs|js)$/.test(file) &&
        !/\.test\.ts$/.test(file) && !file.includes("/generated/")) :
    [];
  for (const file of [
    ...runtimeSources(path.join(root, "functions/src")),
    ...runtimeSources(path.join(root, "functions/scripts")),
    ...runtimeSources(path.join(root, "admin/src/shared")),
    ...runtimeSources(path.join(root, "website/src")),
  ]) {
    const info = ts.preProcessFile(fs.readFileSync(file, "utf8"), true, true);
    for (const {fileName} of info.importedFiles) {
      if (!fileName.startsWith(".")) continue;
      imported.add(path.resolve(path.dirname(file), fileName)
        .replace("/functions/lib/", "/functions/src/")
        .replace(/\.js$/, "").concat(".ts"));
    }
  }
  const unused = [
    ...declared.validators.filter((name) =>
      !imported.has(moduleOf.get(`validators:${name}`)) &&
      !imported.has(moduleOf.get(`schemas:${name}`))),
    ...declared.types.filter((name) =>
      !imported.has(moduleOf.get(`types:${name}`))),
  ];
  assert.deepEqual(unused, [],
    "Remove these from contracts/functions/runtime_modules.json and regenerate");
});

const dartDirectories = [
  "lib/platform/schema_contracts/generated/schemas",
  "lib/platform/schema_contracts/generated/callables",
];

function outputFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "schema-outputs-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const files = [
    ...dartDirectories.map((folder) => ({
      path: `${folder}/current.g.dart`, content: "const current = 1;\n",
    })),
    {path: "functions/src/shared/generated/schemas/current.ts",
      content: "export const current = 1;\n"},
  ];
  const write = (relativePath, content) => {
    const absolutePath = path.join(directory, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
    fs.writeFileSync(absolutePath, content);
  };
  for (const file of files) write(file.path, file.content);
  const hashes = () => Object.fromEntries(
    fs.readdirSync(directory, {recursive: true}).sort()
      .filter((file) => fs.statSync(path.join(directory, file)).isFile())
      .map((file) => [file, createHash("sha256")
        .update(fs.readFileSync(path.join(directory, file))).digest("hex")]),
  );
  const check = (expected = files) => {
    const before = hashes();
    const stale = publishSchemaOutputs({
      root: directory, files: expected, checkOnly: true,
    });
    assert.deepEqual(hashes(), before, "check mode must not mutate any file");
    return stale.sort();
  };
  return {directory, files, write, hashes, check};
}

test("canonical generator output membership and contents pass without writes", (t) => {
  assert.deepEqual(outputFixture(t).check(), []);
});

for (const directory of dartDirectories) {
  test(`check rejects an obsolete Dart output in ${directory}`, (t) => {
    const fixture = outputFixture(t);
    const orphan = `${directory}/obsolete.g.dart`;
    fixture.write(orphan, "const obsolete = 1;\n");
    assert.deepEqual(fixture.check(), [orphan]);
  });

  test(`check rejects nested extra output in ${directory}`, (t) => {
    const fixture = outputFixture(t);
    const orphan = `${directory}/nested/obsolete.g.dart`;
    fixture.write(orphan, "class Obsolete {}\n");
    assert.deepEqual(fixture.check(), [orphan]);
  });

  test(`renamed schema cannot leave its former output in ${directory}`, (t) => {
    const fixture = outputFixture(t);
    const oldPath = `${directory}/current.g.dart`;
    const renamedPath = `${directory}/renamed.g.dart`;
    const expected = fixture.files.map((file) => file.path === oldPath ?
      {...file, path: renamedPath} : file);
    fixture.write(renamedPath, "const current = 1;\n");
    assert.deepEqual(fixture.check(expected), [oldPath]);
  });

  test(`removed schema cannot leave its output in ${directory}`, (t) => {
    const fixture = outputFixture(t);
    const removedPath = `${directory}/current.g.dart`;
    const expected = fixture.files.filter((file) => file.path !== removedPath);
    assert.deepEqual(fixture.check(expected), [removedPath]);
  });
}

test("check still rejects missing and corrupt expected outputs without writes", (t) => {
  const fixture = outputFixture(t);
  const [missing, corrupt] = fixture.files;
  fs.unlinkSync(path.join(fixture.directory, missing.path));
  fixture.write(corrupt.path, "// corrupted\n");
  assert.deepEqual(fixture.check(), [missing.path, corrupt.path].sort());
});

test("check retains orphan detection in all exclusive Functions directories", (t) => {
  const fixture = outputFixture(t);
  const orphans = ["schemas", "validators", "catalogs"].map((directory) =>
    `functions/src/shared/generated/${directory}/obsolete.ts`);
  for (const orphan of orphans) fixture.write(orphan, "export const obsolete = 1;\n");
  assert.deepEqual(fixture.check(), orphans.sort());
});

test("check accepts outputs owned by other generators without writes", (t) => {
  const fixture = outputFixture(t);
  for (const relativePath of [
    "lib/platform/schema_contracts/generated/domain_producer.g.dart",
    "lib/platform/schema_contracts/generated/schemas_other/current.g.dart",
    "lib/l10n/generated/structured_domain_copy.g.dart",
    "functions/src/shared/generated/anotherProducer.ts",
  ]) fixture.write(relativePath, "// independently generated\n");
  assert.deepEqual(fixture.check(), []);
});

test("publication removes only owned stale outputs and restores expected contents", (t) => {
  const fixture = outputFixture(t);
  const foreign = "lib/platform/schema_contracts/generated/domain_producer.g.dart";
  fixture.write(foreign, "// keep this producer\n");
  const foreignHash = fixture.hashes()[foreign];
  for (const directory of dartDirectories) {
    fixture.write(`${directory}/obsolete.g.dart`, "const obsolete = 1;\n");
    fixture.write(`${directory}/nested/obsolete.g.dart`, "const obsolete = 2;\n");
  }
  fixture.write("functions/src/shared/generated/schemas/obsolete.ts", "// old\n");
  fixture.write(fixture.files[0].path, "// corrupt\n");
  fs.unlinkSync(path.join(fixture.directory, fixture.files[1].path));
  assert.deepEqual(publishSchemaOutputs({
    root: fixture.directory, files: fixture.files, checkOnly: false,
  }), []);
  assert.deepEqual(Object.keys(fixture.hashes()).sort(),
    [...fixture.files.map((file) => file.path), foreign].sort());
  assert.equal(fixture.hashes()[foreign], foreignHash);
  assert.deepEqual(fixture.check(), []);
});

test("field constraints keep only declared bindings and lookup prefixes", () => {
  const projected = [
    "claim.profile.city", "claim.profile.languages", "claim.reviewedUrl",
    "event.capacity", "event.title", "event.description",
  ].map((entryPath) => ({path: entryPath, constName: entryPath}));
  const bound = boundFieldConstraints(projected, {
    lookupPrefixes: ["claim.profile."],
    fields: {event: ["title", "capacity"], claim: ["profile.city"]},
  });
  assert.deepEqual(bound.map((entry) => entry.path), [
    "claim.profile.city", "claim.profile.languages",
    "event.capacity", "event.title",
  ]);
});

test("field constraint bindings fail on paths no schema projects", () => {
  const projected = [{path: "event.title", constName: "eventTitle"}];
  assert.throws(() => boundFieldConstraints(projected, {
    lookupPrefixes: ["claim.profile."],
    fields: {event: ["title", "subtitle"]},
  }), /- event\.subtitle\n- claim\.profile\.\*/);
});

test("Functions runtime modules close over generated type dependencies", () => {
  const modules = functionsRuntimeModules({
    declaration: {validators: ["EventDocument"], types: ["Organizer"]},
    specNames: ["EventDocument", "Organizer", "Venue", "Photo", "Unused"],
    typeDependencies: new Map([["EventDocument", ["Venue"]], ["Venue", ["Photo"]]]),
    adminTypeDependencies: ["Photo"],
  });
  assert.deepEqual([...modules.validators], ["EventDocument"]);
  assert.deepEqual([...modules.types].sort(),
    ["EventDocument", "Organizer", "Photo", "Venue"]);
});

test("Functions runtime modules reject undeclared schema spec names", () => {
  assert.throws(() => functionsRuntimeModules({
    declaration: {validators: ["EventDocument"], types: ["Missing"]},
    specNames: ["EventDocument"],
    typeDependencies: new Map(),
    adminTypeDependencies: [],
  }), /unknown schema specs:\n- Missing/);
});

test("check reports and publish removes retired outputs only when present", (t) => {
  const fixture = outputFixture(t);
  const retired = "functions/src/shared/generated/schemaValidators.ts";
  fixture.write(retired, "export {};\n");
  assert.deepEqual(publishSchemaOutputs({root: fixture.directory,
    files: fixture.files, checkOnly: true, retiredFiles: [retired]}), [retired]);
  publishSchemaOutputs({root: fixture.directory, files: fixture.files,
    checkOnly: false, retiredFiles: [retired]});
  assert.ok(!fs.existsSync(path.join(fixture.directory, retired)));
  assert.deepEqual(publishSchemaOutputs({root: fixture.directory,
    files: fixture.files, checkOnly: true, retiredFiles: [retired]}), []);
});
