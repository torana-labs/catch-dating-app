import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectPrimitiveContractUseCases,
  parsePrimitiveContractUseCases,
  validateGeometrySpecimens,
  validatePrimitiveContractUseCases,
} from "./check_widgetbook_contract_refs.mjs";

const registry = {
  components: [{
    id: "catch.banner",
    dart: {symbol: "CatchBanner"},
    contract: {states: ["message", "error", "offline", "stacked"]},
  }],
};
const recipe = (states) => `
@widgetbook.UseCase(name: 'Recipe', type: CatchBanner,)
Widget specimen(BuildContext context) => WidgetbookContractFrame(
  contractId: 'catch.banner', states: const [${states.map((s) => `'${s}'`).join(",")}],
);`;

test("all named recipes contribute to their canonical component contract", () => {
  const inventory = parsePrimitiveContractUseCases(
    recipe(["message", "error"]) + recipe(["offline", "stacked"]),
  );
  assert.deepEqual(inventory.statesByContractId.get("catch.banner"),
    ["message", "error", "offline", "stacked"]);
  assert.deepEqual(validatePrimitiveContractUseCases(registry, inventory), []);
});

test("split geometry specimens retain exact type, path, and generated registration requirements", () => {
  const specimens = [
    ["modals", "modalGeometryMatrix", "CatchSheet"],
    ["buttons", "buttonGeometryMatrix", "CatchButton"],
    ["menus", "menuGeometryMatrix", "CatchMenu"],
    ["fields", "fieldAndSectionGeometryMatrix", "CatchSection"],
    ["navigation", "bottomNavigationGeometryMatrix", "CatchTabBar"],
    ["top_bars", "topBarGeometryMatrix", "CatchLegacyTopBar"],
  ];
  const useCaseByKey = new Map(specimens.map(([file, builder, type]) => [
    `widgetbook/lib/geometry/specimens/${file}.dart:${builder}`,
    {type, path: "[Geometry system]"},
  ]));
  const generatedUseCaseKeys = new Set(useCaseByKey.keys());
  assert.deepEqual(validateGeometrySpecimens({generatedUseCaseKeys}, {useCaseByKey}), []);
  for (const [key, specimen] of useCaseByKey) {
    const missing = new Map(useCaseByKey);
    missing.delete(key);
    assert.match(validateGeometrySpecimens({generatedUseCaseKeys}, {useCaseByKey: missing}).join("\n"), /missing required Widgetbook geometry use case/);
    const unregistered = new Set(generatedUseCaseKeys);
    unregistered.delete(key);
    assert.match(validateGeometrySpecimens({generatedUseCaseKeys: unregistered}, {useCaseByKey}).join("\n"), /missing from generated Widgetbook directories/);
    for (const bad of [{...specimen, type: "WrongComponent"}, {...specimen, path: "[Elsewhere]"}]) {
      const altered = new Map(useCaseByKey).set(key, bad);
      assert.match(validateGeometrySpecimens({generatedUseCaseKeys}, {useCaseByKey: altered}).join("\n"), /expected @UseCase/);
    }
  }
});

test("removing a recipe or a state cannot be masked by a later preview", () => {
  for (const source of [
    recipe(["offline", "stacked"]),
    recipe(["message", "error"]) + recipe(["offline"]),
    recipe(["message", "error"]) + recipe(["offline", "stacked", "unexpected"]),
  ]) {
    assert.match(validatePrimitiveContractUseCases(
      registry, parsePrimitiveContractUseCases(source),
    ).join("\n"), /do not match component contract states/);
  }
});

test("repeated states do not hide missing states or change declaration order", () => {
  const inventory = parsePrimitiveContractUseCases(
    recipe(["message", "error"]) + recipe(["message", "offline", "stacked"]),
  );
  assert.deepEqual(validatePrimitiveContractUseCases(registry, inventory), []);
});

test("split contract families are discovered and a deleted family cannot pass", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-contract-families-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const directory = path.join(root, "widgetbook/lib/primitives/contracts");
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, "banner.dart"), recipe(["message", "error"]));
  fs.writeFileSync(path.join(directory, "statuses.dart"), recipe(["offline", "stacked"]));
  assert.deepEqual(validatePrimitiveContractUseCases(registry, collectPrimitiveContractUseCases({root})), []);
  fs.unlinkSync(path.join(directory, "banner.dart"));
  assert.match(validatePrimitiveContractUseCases(registry, collectPrimitiveContractUseCases({root})).join("\n"),
    /do not match component contract states/);
  fs.unlinkSync(path.join(directory, "statuses.dart"));
  assert.throws(() => collectPrimitiveContractUseCases({root}), /no Dart sources/);
});

test("a planned record needs no contract preview until it has code", () => {
  const planned = {components: [{id: "catch.toast", status: "planned", kind: "composite", contract: {states: []}}]};
  const none = parsePrimitiveContractUseCases("");
  assert.deepEqual(validatePrimitiveContractUseCases(planned, none), []);
  const active = {components: [{...planned.components[0], status: "active", dart: {symbol: "CatchToast"}}]};
  assert.ok(validatePrimitiveContractUseCases(active, none).some((error) => error.includes("catch.toast")));
});
