import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {compareWithGenerated, generatedUseCaseKeys, readWidgetbookUseCases, widgetbookComponentNames}
  from "./widgetbook_use_cases.mjs";

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-widgetbook-use-cases-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const useCase = (type, name, builder, extra = "") =>
  `@widgetbook.UseCase(\n  name: ${name},\n  type: ${type},\n${extra})\nWidget ${builder}(BuildContext context) => const SizedBox();\n`;

test("names follow widgetbook_generator: raw generics instantiate to bounds, a lone <dynamic> drops", t => {
  const root = fixture(t, {
    "packages/catch_ui/lib/src/menu.dart": "class CatchMenu<T> extends StatefulWidget {}\n",
    "packages/catch_ui/lib/src/field.dart": "class CatchFormChoiceField<P, T> extends StatefulWidget {}\n",
    "lib/profile/row.dart": "class ProfileMultiEnumRow<T extends Labelled> extends StatelessWidget {}\n",
    "widgetbook/lib/a.dart": [
      useCase("CatchMenu", "'Catalog states'", "catchMenuStates", "  path: '[Core]/Menus',\n"),
      useCase("CatchFormChoiceField", "'Typed rows'", "fieldStates"),
      useCase("ProfileMultiEnumRow", '"Who\'s going"', "rowStates"),
      useCase("PlainWidget", "'Plain'", "plainStates"),
    ].join("\n"),
    "widgetbook/lib/main.directories.g.dart": "// generated output is never read\n",
  });
  assert.deepEqual(readWidgetbookUseCases(root), [
    {component: "CatchMenu", name: "Catalog states", builder: "catchMenuStates",
      sourcePath: "widgetbook/lib/a.dart", path: "[Core]/Menus"},
    {component: "CatchFormChoiceField<dynamic, dynamic>", name: "Typed rows", builder: "fieldStates",
      sourcePath: "widgetbook/lib/a.dart", path: null},
    {component: "ProfileMultiEnumRow<Labelled>", name: "Who's going", builder: "rowStates",
      sourcePath: "widgetbook/lib/a.dart", path: null},
    {component: "PlainWidget", name: "Plain", builder: "plainStates",
      sourcePath: "widgetbook/lib/a.dart", path: null},
  ]);
  assert.ok(widgetbookComponentNames(root).has("CatchFormChoiceField<dynamic, dynamic>"));
});

test("verification fails on any use case the generator and the annotations disagree on", t => {
  const root = fixture(t, {"widgetbook/lib/b.dart": useCase("CatchChip", "'Who\\'s in'", "chipStates")});
  const generated = (name, builder) => [
    "import 'package:widgetbook_workspace/b.dart'",
    "    as _widgetbook_workspace_b;",
    "_widgetbook.WidgetbookComponent(",
    "  name: 'CatchChip',",
    "  useCases: [",
    "    _widgetbook.WidgetbookUseCase(",
    `      name: '${name}',`,
    "      builder: _widgetbook_workspace_b",
    `          .${builder},`,
    "    ),",
    "  ],",
    "),",
  ].join("\n");
  assert.deepEqual(generatedUseCaseKeys(generated("Who\\'s in", "chipStates")),
    ["CatchChip|Who's in|widgetbook/lib/b.dart|chipStates"]);
  assert.deepEqual(compareWithGenerated(root, generated("Who\\'s in", "chipStates")), []);
  assert.equal(compareWithGenerated(root, generated("Renamed", "chipStates")).length, 2);
  assert.equal(compareWithGenerated(root, generated("Who\\'s in", "otherStates")).length, 2);
  assert.equal(compareWithGenerated(root, "").length, 1);
});
