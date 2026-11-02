import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findDesignSource,
  flutterSection,
  guidelineBody,
  importDesignSource,
  parseSystemTypes,
  section,
  statesFrom,
  writeSystemBlocks,
} from "./import_ds_props.mjs";

const types = `import * as React from "react";
export interface FooProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The words. */
    title: React.ReactNode;
    size?: "md" | "sm";
    action?: { label: string; onPressed?: () => void; };
    items?: Array<{ label: React.ReactNode; }>;
    format?: (value: number) => React.ReactNode;
}
/** A foo. */
export declare function Foo({ title, size, action, children }: FooProps): React.JSX.Element;
export declare const Bar: React.ForwardRefExoticComponent<{ label?: string; } & React.RefAttributes<HTMLElement>>;
export declare function GroundProvider({ ground }: { ground: string; }): React.JSX.Element;
export declare function useFoo(): void;
`;
const readme = `A foo.

**Registry:** \`catch.foo\` · Flutter and React: \`CatchFoo\` · In this system: \`Catch.Foo\`

## What you provide
\`title\`, \`size\`.

## States and motion
Rest, hover, pressed (scale 0.9), disabled.

## Flutter
\`\`\`dart
CatchFoo(title: 'made up')
\`\`\`

## Replaces
Old foos.
`;
const table = {
  Foo: {symbol: "CatchFoo", records: ["catch.foo", "catch.foo_two"], readme: "Foo"},
  Bar: {symbol: "CatchBar", records: ["catch.bar"]},
};

function fixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "import-ds-props-"));
  const root = path.join(base, "repo");
  const source = path.join(base, "catch-design-source");
  const components = path.join(source, "ds/catch/project/components");
  fs.mkdirSync(path.join(root, "design/components"), {recursive: true});
  fs.mkdirSync(path.join(components, "Foo"), {recursive: true});
  fs.mkdirSync(path.join(source, "ds/src"), {recursive: true});
  fs.writeFileSync(path.join(components, "index.d.ts"), types);
  fs.writeFileSync(path.join(components, "Foo/README.md"), readme);
  fs.writeFileSync(path.join(components, "Foo/preview.html"), "part('Error'), part('On a tile, with a note')");
  fs.writeFileSync(path.join(source, "ds/src/index.ts"), "export const CatchFoo = Foo;\nexport const CatchBar = Bar;\n");
  const record = (id, extra) => [
    "    {",
    `      "id": "${id}",`,
    '      "aliases": ["Kept", "Inline"],',
    ...extra,
  ];
  fs.writeFileSync(path.join(root, "design/components/catch.components.json"), [
    "{",
    '  "version": 4,',
    '  "components": [',
    ...record("catch.foo", ['      "dart": {"symbol": "CatchFoo", "constructors": ["CatchFoo", "CatchFoo.big"]}']),
    "    },",
    ...record("catch.foo_two", ['      "dart": {"symbol": "CatchFooTwo"}']),
    "    },",
    ...record("catch.bar", ['      "status": "planned"']),
    "    }",
    "  ]",
    "}",
    "",
  ].join("\n"));
  return {root, source, components};
}

const registryOf = (root) => JSON.parse(fs.readFileSync(path.join(root, "design/components/catch.components.json"), "utf8"));
const byId = (root, id) => registryOf(root).components.find((component) => component.id === id);

test("parses a component's own props, as a function or a forwardRef const", () => {
  const declarations = parseSystemTypes(types);
  assert.deepEqual(declarations.get("Foo").props.slice(0, 2), [
    {name: "title", tsType: "React.ReactNode", required: true},
    {name: "size", tsType: '"md" | "sm"', required: false},
  ]);
  assert.equal(declarations.get("Foo").destructuresChildren, true);
  assert.equal(declarations.get("Foo").summary, "A foo.");
  assert.deepEqual(declarations.get("Bar").props, [{name: "label", tsType: "string", required: false}]);
});

test("states come from a README list, prose and the preview's part titles", () => {
  assert.deepEqual(statesFrom("Rest, hover (4%), pressed (8%), focus ring, disabled (40%), loading (spinner).", []),
    ["rest", "hover", "pressed", "focus", "loading", "disabled"]);
  assert.deepEqual(statesFrom("Pressable blocks: hover layer, pressed scale 0.99, focus ring."), ["rest", "hover", "pressed", "focus"]);
  assert.deepEqual(statesFrom("Static; a live dot pulses."), ["rest", "live"]);
  assert.deepEqual(statesFrom("Opens the full map on tap."), ["rest"]);
  assert.deepEqual(statesFrom("Opens over 240 ms."), ["rest", "open"]);
  assert.deepEqual(statesFrom("The thumb springs.", ["Off, on, disabled", "On a tile, with a note", "Night: the live console"]),
    ["rest", "on", "off", "disabled"]);
});

test("the Flutter section names constructors and says when there is no symbol", () => {
  const text = flutterSection([
    {id: "catch.foo", dart: {symbol: "CatchFoo", constructors: ["CatchFoo", "CatchFoo.big"]}},
    {id: "catch.foo_two", dart: {symbol: "CatchFooTwo"}},
    {id: "catch.bar", status: "planned"},
  ]);
  assert.match(text, /- `CatchFoo\.big`/u);
  assert.match(text, /- `CatchFooTwo`/u);
  assert.match(text, /`catch\.bar`: No Flutter symbol yet\./u);
  assert.equal(section(guidelineBody(readme), "Replaces"), "Old foos.");
  assert.doesNotMatch(guidelineBody(readme), /made up/u);
});

test("writes blocks and guidelines, keeps other fields byte for byte, and is idempotent", () => {
  const {root, source} = fixture();
  const before = fs.readFileSync(path.join(root, "design/components/catch.components.json"), "utf8");
  assert.deepEqual(importDesignSource({root, sourceRoot: source, check: false, table}).problems, []);
  const first = fs.readFileSync(path.join(root, "design/components/catch.components.json"), "utf8");
  assert.ok(first.includes('"aliases": ["Kept", "Inline"]'));
  const system = byId(root, "catch.foo").system;
  assert.equal(system.name, "Foo");
  assert.deepEqual(system.states, ["rest", "hover", "pressed", "error", "disabled"]);
  assert.deepEqual(system.slots, ["title", "action", "children"]);
  assert.deepEqual(byId(root, "catch.foo_two").system, system);
  assert.deepEqual(writeSystemBlocks(first, new Map()), first);
  assert.ok(before.length < first.length);

  const guideline = fs.readFileSync(path.join(root, "design/components/guidelines/catch.foo.md"), "utf8");
  assert.match(guideline, /<!-- generated:flutter:start -->/u);
  assert.match(guideline, /`CatchFoo\.big`/u);
  assert.doesNotMatch(guideline, /made up/u);
  assert.match(guideline, /Old foos\./u);
  const planned = fs.readFileSync(path.join(root, "design/components/guidelines/catch.bar.md"), "utf8");
  assert.match(planned, /No Flutter symbol yet/u);

  assert.deepEqual(importDesignSource({root, sourceRoot: source, check: false, table}).problems, []);
  assert.equal(fs.readFileSync(path.join(root, "design/components/catch.components.json"), "utf8"), first);
  assert.deepEqual(importDesignSource({root, sourceRoot: source, check: true, table}).problems, []);
});

test("--check fails when the registry, a guideline or the source moves", () => {
  const {root, source, components} = fixture();
  importDesignSource({root, sourceRoot: source, check: false, table});
  const registryFile = path.join(root, "design/components/catch.components.json");
  const guideline = path.join(root, "design/components/guidelines/catch.foo.md");
  const original = fs.readFileSync(registryFile, "utf8");

  fs.writeFileSync(registryFile, original.replace('"name": "title"', '"name": "heading"'));
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /system blocks are stale/u);
  fs.writeFileSync(registryFile, original);

  const text = fs.readFileSync(guideline, "utf8");
  fs.writeFileSync(guideline, text.replace("`CatchFoo.big`", "`CatchFoo.gone`"));
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /catch\.foo\.md is stale/u);
  fs.writeFileSync(guideline, text);

  fs.writeFileSync(path.join(path.dirname(guideline), "catch.stray.md"), "x");
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /catch\.stray\.md belongs to no system component/u);
  fs.rmSync(path.join(path.dirname(guideline), "catch.stray.md"));

  fs.writeFileSync(path.join(components, "index.d.ts"), types.replace("size?:", "sized?:"));
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /differs from the design source/u);
  fs.writeFileSync(path.join(components, "index.d.ts"), `${types}export declare function Baz(): void;\n`);
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /declares Baz, which the system table does not assign/u);
});

test("without the source --check still compares props, slots and Flutter sections, and says what it skipped", () => {
  const {root, source} = fixture();
  importDesignSource({root, sourceRoot: source, check: false, table});
  const clean = importDesignSource({root, sourceRoot: null, check: true, table});
  assert.deepEqual(clean.problems, []);
  assert.match(clean.notices.join("\n"), /states and guideline text were not compared/u);

  const registryFile = path.join(root, "design/components/catch.components.json");
  const original = fs.readFileSync(registryFile, "utf8");
  fs.writeFileSync(registryFile, original.replace('"name": "title"', '"name": "heading"'));
  assert.match(importDesignSource({root, sourceRoot: null, check: true, table}).problems.join("\n"), /system blocks are stale/u);
  fs.writeFileSync(registryFile, original.replace('"CatchFoo.big"', '"CatchFoo.large"'));
  assert.match(importDesignSource({root, sourceRoot: null, check: true, table}).problems.join("\n"), /catch\.foo\.md is stale/u);
  assert.match(importDesignSource({root, sourceRoot: null, check: false, table}).problems.join("\n"), /No design source found/u);
});

test("a ds/src symbol that disagrees with the table fails", () => {
  const {root, source} = fixture();
  fs.writeFileSync(path.join(source, "ds/src/index.ts"), "export const CatchFooRenamed = Foo;\nexport const CatchBar = Bar;\n");
  assert.match(importDesignSource({root, sourceRoot: source, check: true, table}).problems.join("\n"), /exports Foo as CatchFooRenamed/u);
});

test("finds the design source beside the repo or above a task worktree", () => {
  const {root, source} = fixture();
  assert.equal(findDesignSource(root), source);
  const worktree = path.join(root, ".claude/worktrees/task");
  fs.mkdirSync(worktree, {recursive: true});
  assert.equal(findDesignSource(worktree), source);
});

test("the repository's import is current", () => {
  const result = spawnSync(process.execPath, ["tool/design/import_ds_props.mjs", "--check"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
});

test("the command line rejects unknown flags and a missing source", () => {
  const run = (args) => spawnSync(process.execPath, ["tool/design/import_ds_props.mjs", ...args], {encoding: "utf8"});
  assert.equal(run(["--nope"]).status, 64);
  assert.equal(run(["--check", "--source", "/nonexistent/catch-design-source"]).status, 1);
});
