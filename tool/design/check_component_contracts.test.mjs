import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {isComponentSourcePath} from "./lib/component_source_path.mjs";
import {isProductionWidgetDartPath} from "./lib/production_widget_roots.mjs";

const schema = JSON.parse(fs.readFileSync(
  new URL("../../design/components/catch.components.schema.json", import.meta.url), "utf8",
));
const pathSchemas = [
  schema.$defs.component.properties.dart.properties.file,
  schema.$defs.contractMember.properties.file,
];

test("component and member paths accept both production source homes", () => {
  for (const file of ["lib/core/widgets/catch_surface.dart",
    "packages/catch_ui/lib/src/primitives/catch_surface.dart"]) {
    assert.equal(isComponentSourcePath(file), true);
    assert.equal(isProductionWidgetDartPath(file), true);
    for (const pathSchema of pathSchemas) {
      assert.equal(new Ajv2020().compile(pathSchema)(file), true);
    }
  }
});

test("component paths reject test, tool and unrelated package sources", () => {
  for (const file of ["test/catch_surface.dart", "tool/catch_surface.dart",
    "packages/other/lib/catch_surface.dart", "packages/catch_ui/test/example.dart"]) {
    assert.equal(isComponentSourcePath(file), false);
    for (const pathSchema of pathSchemas) {
      assert.equal(new Ajv2020().compile(pathSchema)(file), false);
    }
  }
  assert.equal(isComponentSourcePath("packages/catch_ui/lib/../test/example.dart"), false);
  assert.equal(isProductionWidgetDartPath("packages/catch_ui/lib/../test/example.dart"), false);
});

test("only a planned record may omit dart", () => {
  const validate = new Ajv2020({allErrors: true, strict: false}).compile({...schema.$defs.component, $defs: schema.$defs});
  const missingDart = (status) => {
    validate({id: "catch.x", status});
    return (validate.errors ?? []).some((error) => error.params?.missingProperty === "dart");
  };
  assert.equal(missingDart("active"), true);
  assert.equal(missingDart("planned"), false);
});
