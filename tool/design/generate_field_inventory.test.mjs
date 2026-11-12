import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildFieldFacadeInventory,
  buildFromRepo,
  extractCatchFieldFacades,
  extractCatchSectionContract,
  extractCatchSectionVariants,
  facadeUseWhen,
} from "./generate_field_inventory.mjs";

const source = fs.readFileSync("packages/catch_ui/lib/src/components/catch_field.dart", "utf8");
const sectionSource = fs.readFileSync(
  "packages/catch_ui/lib/src/components/catch_section.dart",
  "utf8",
);
const statusPath = "packages/catch_ui/lib/src/components/catch_field_status.dart";
const statusSource = fs.readFileSync(statusPath, "utf8");
const {interactionContracts} = JSON.parse(
  fs.readFileSync("design/components/catch.components.json", "utf8"),
);

test("builds the live inventory from the package-owned status enum", () => {
  const inventory = buildFromRepo();
  assert.equal(inventory.summary.facadeCount, 16);
  assert.equal(inventory.summary.saveStateCount, 3);
  assert.equal(inventory.source.catchFieldStatus, statusPath);
  assert.match(inventory.source.catchFieldStatusApiSha256, /^[a-f0-9]{64}$/u);
});

test("rejects package status drift even when the former owner has a matching enum", () => {
  assert.throws(
    () => buildFieldFacadeInventory({
      fieldSource: `${source}\n${statusSource}`,
      sectionSource,
      statusSource: statusSource.replace(/\bsaved\b/u, "synced"),
      interactionContracts,
    }),
    /interactionContracts\.field_row\.saveStates drifted/u,
  );
});

test("does not fall back to a status enum in the former owner", () => {
  assert.throws(
    () => buildFieldFacadeInventory({
      fieldSource: `${source}\n${statusSource}`,
      sectionSource,
      statusSource: "",
      interactionContracts,
    }),
    /Unable to find enum CatchFieldStatus/u,
  );
});

test("extracts every current facade and semantic slot", () => {
  const facades = extractCatchFieldFacades(source);
  assert.deepEqual(
    facades.map((entry) => entry.mode),
    [
      "read",
      "content",
      "navigate",
      "nav",
      "sortable",
      "action",
      "toggle",
      "input",
      "control",
      "choices",
      "optionCards",
      "stepper",
      "slider",
      "inputActions",
      "add",
      "select",
    ],
  );
  assert.ok(facades.find((entry) => entry.mode === "input").slots.includes("error"));
  assert.ok(facades.find((entry) => entry.mode === "choices").slots.includes("control"));
  assert.ok(facades.find((entry) => entry.mode === "control").slots.includes("control"));
  assert.ok(facades.find((entry) => entry.mode === "select").slots.includes("error"));
  assert.ok(facades.find((entry) => entry.mode === "read").slots.includes("actions"));
  assert.deepEqual(facades.find((entry) => entry.mode === "navigate").slots, [
    "content", "secondary-action",
  ]);
  assert.ok(facades.find((entry) => entry.mode === "read").slots.includes("content"));
  assert.ok(facades.find((entry) => entry.mode === "inputActions").slots.includes("feedback"));
  assert.deepEqual(extractCatchSectionVariants(sectionSource), [
    "divided",
    "fieldRows",
    "choiceGroup",
    "containedFieldRows",
    "containedFieldGroups",
    "contained",
    "plain",
    "horizontal",
    "rows",
    "loadingRows",
    "controls",
    "containedRows",
    "containedLoadingRows",
    "dependentFieldRows",
    "action",
    "collection",
    "status",
    "content",
    "sliverRows",
    "sliverLoadingRows",
  ]);
  assert.deepEqual(extractCatchSectionContract(sectionSource).slots, [
    "title",
    "subtitle",
    "trailing",
    "count",
    "footer",
    "groups",
    "children",
    "child",
    "leading",
    "message",
    "details",
    "action-label",
    "on-action",
    "action-key",
    "icon",
    "action-emphasis",
    "action-status",
    "feedback",
  ]);
});

test("known-bad deleted facade changes generated inventory", () => {
  const deleted = source.replace(
    "const CatchField.add(",
    "const CatchField._add(",
  );
  const modes = extractCatchFieldFacades(deleted).map((entry) => entry.mode);
  assert.ok(!modes.includes("add"));
  assert.equal(modes.length, 15);
});

test("known-bad added slot parameter changes generated inventory", () => {
  const changed = source.replace(
    "const CatchField.read({",
    "const CatchField.read({\n    Widget? trailing,",
  );
  const read = extractCatchFieldFacades(changed).find((entry) => entry.mode === "read");
  assert.ok(read.parameters.some((parameter) => parameter.name === "trailing"));
  assert.ok(read.slots.includes("suffix"));
});

test("rejects a facade without owner-reviewed use-when metadata", () => {
  const metadata = {...facadeUseWhen};
  delete metadata.optionCards;
  assert.throws(
    () => extractCatchFieldFacades(source, {useWhen: metadata}),
    /optionCards is missing owner-reviewed use-when metadata/u,
  );
});


test("private named initializing formals retain public parameter and slot names", () => {
  const facades = extractCatchFieldFacades(`
    const CatchField.inputActions({
      required String this.title,
      this._meta,
      this._actions,
      this._child,
    });
  `);
  assert.deepEqual(facades[0].parameters.map(({name}) => name), [
    "title", "meta", "actions", "child",
  ]);
  assert.deepEqual(facades[0].slots, ["title", "support", "feedback", "actions"]);
});

test("section factories preserve source order and omit package-internal adapters", () => {
  const contract = extractCatchSectionContract(`
    const CatchSection.content({required Widget child});
    @internal
    factory CatchSection.formRows({required List<Widget> children});
    factory CatchSection.sliverRows({required CatchField Function(BuildContext, int) itemBuilder});
    const CatchSection._rows({required Widget child});
  `);
  assert.deepEqual(contract.variants, ["content", "sliverRows"]);
  assert.deepEqual(contract.slots, ["children", "child"]);
});

test("action section meta and footer retain details and feedback semantics", () => {
  const action = extractCatchSectionContract(`
    factory CatchSection.action({required String message, Widget? meta, Widget? footer});
  `);
  assert.deepEqual(action.slots, ["message", "details", "feedback"]);
  const ordinary = extractCatchSectionContract(`
    const CatchSection.rows({Widget? footer});
  `);
  assert.deepEqual(ordinary.slots, ["footer"]);
});

test("canonical slots retain their recipe-specific placement without former aliases", () => {
  const facades = extractCatchFieldFacades(`
    const CatchField.input({this.leading, this.trailing, this.actions, this.onValidate});
    const CatchField.control({this.child});
    const CatchField.inputActions({this.meta, this.actions, this.child});
  `);
  assert.deepEqual(facades.map(({slots}) => slots), [
    ["prefix", "suffix", "error", "actions"],
    ["control"],
    ["support", "feedback", "actions"],
  ]);
});
