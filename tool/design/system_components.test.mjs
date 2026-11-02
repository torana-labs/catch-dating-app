import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  declaredSystemNames,
  systemBlockProblems,
  systemComponents,
  systemTypesPath,
  tableSystemNames,
} from "./lib/system_components.mjs";

const table = {
  Foo: {symbol: "CatchFoo", records: ["catch.foo", "catch.foo_two"], parts: ["FooPart"]},
  Bar: {symbol: "CatchBar", records: ["catch.bar"]},
};
const declared = new Set(["Foo", "FooPart", "Bar"]);
const record = (id, tier, name) => ({id, tier, ...(name ? {system: {name}} : {})});

test("declared names are exported PascalCase declarations, not helpers", () => {
  const names = declaredSystemNames([
    "export declare function Foo(): void;",
    "export declare const Bar: unknown;",
    "export declare function GroundProvider(): void;",
    "export declare function useFoo(): void;",
    "declare const Internal: unknown;",
  ].join("\n"));
  assert.deepEqual([...names], ["Foo", "Bar"]);
});

test("a T1 or T2 record the table assigns keeps its system block", () => {
  const problems = systemBlockProblems({
    components: [record("catch.foo", "T1"), record("catch.foo_two", "T3"), record("catch.bar", "T2", "Bar")],
    declaredNames: declared,
    table,
  });
  assert.deepEqual(problems, ["catch.foo: T1 record must keep its system block (Foo)"]);
});

test("a system block naming a component index.d.ts lacks fails", () => {
  const problems = systemBlockProblems({
    components: [record("catch.foo", "T1", "Foo"), record("catch.foo_two", "T1", "Foo"), record("catch.bar", "T1", "Gone")],
    declaredNames: declared,
    table,
  });
  assert.ok(problems.some((problem) => problem.includes("catch.bar: system.name Gone is not declared")), problems.join("\n"));
});

test("only the table assigns a system block", () => {
  const problems = systemBlockProblems({
    components: [record("catch.foo", "T1", "Foo"), record("catch.foo_two", "T1", "Foo"), record("catch.bar", "T1", "Bar"), record("catch.other", "T1", "Bar")],
    declaredNames: declared,
    table,
  });
  assert.deepEqual(problems, ["catch.other: system block Bar is not what the system table assigns (nothing)"]);
});

test("the table and index.d.ts must agree in both directions", () => {
  const problems = systemBlockProblems({
    components: [record("catch.foo", "T1", "Foo"), record("catch.foo_two", "T1", "Foo"), record("catch.bar", "T1", "Bar")],
    declaredNames: new Set(["Foo", "Bar", "Baz"]),
    table,
  });
  assert.deepEqual(problems, [
    `${systemTypesPath} declares Baz, which no registry record carries`,
    `system table names FooPart, which ${systemTypesPath} does not declare`,
  ]);
});

test("the committed index.d.ts declares exactly the table's components", () => {
  const declaredNames = declaredSystemNames(fs.readFileSync(systemTypesPath, "utf8"));
  assert.deepEqual([...declaredNames].sort(), [...tableSystemNames(systemComponents)].sort());
});
