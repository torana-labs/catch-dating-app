import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {
  canonicalWidgetName,
  componentAxes,
  featureWidgetNamingIssues,
  reservedPrefixSymbolProblems,
  roleNounRedirectAdvice,
  topLevelDeclarations,
  componentNamingEntries,
  roleNouns,
  sharedWidgetNamingProblems,
  widgetSlotNames,
} from "./lib/component_naming.mjs";

const home = "packages/catch_ui/lib/src/components/";
function component(symbol, roleNoun, extra = {}) {
  const id = `catch.${symbol.replace(/^Catch/u, "").toLowerCase()}`;
  return {
    id, level: "L3", roleNoun, naming: {useCase: ""},
    dart: {symbol, file: `${home}${snakeCase(symbol)}.dart`},
    governance: {conceptRole: "concept", conceptId: id},
    ...extra,
  };
}
function declarations(components) {
  return componentNamingEntries(components).map((entry) => ({
    name: entry.symbol, file: entry.file, visibility: "public", classKind: "widget",
  }));
}
function problems(components, source = declarations(components)) {
  return sharedWidgetNamingProblems({components, declarations: source});
}
function snakeCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase();
}
function menuFamily() {
  const menu = component("CatchMenu", "Menu");
  menu.contract = {members: [
    {
      id: "catch.menu.action", symbol: "CatchActionMenu", roleNoun: "Menu", level: "L3",
      file: `${home}catch_action_menu.dart`,
      naming: {useCase: "Action", comparedWith: [menu.id],
        reason: "Command trigger applies disabled/destructive policy; it delegates rows to CatchMenu."},
      governance: {conceptRole: "member", conceptId: menu.id,
        parentConceptId: menu.id, qualifier: "adapter"},
    },
    {
      id: "catch.menu.selection", symbol: "CatchSelectionMenu", roleNoun: "Menu", level: "L3",
      file: `${home}catch_selection_menu.dart`,
      naming: {useCase: "Selection", comparedWith: [menu.id, "catch.menu.action"],
        reason: "Typed selection tracks the current value; command rows have no selected value."},
      governance: {conceptRole: "member", conceptId: menu.id,
        parentConceptId: menu.id, qualifier: "adapter"},
    },
  ]};
  return [menu];
}

test("closed schema vocabulary includes all five reviewed responsibilities", () => {
  for (const role of ["Menu", "Surface", "Input", "Text", "Image"]) {
    assert.ok(roleNouns.includes(role));
    assert.deepEqual(problems([component(`Catch${role}`, role)]), []);
  }
  assert.equal(roleNouns.includes("Pill"), false);
});

test("the durable naming vocabulary matches the schema exactly", () => {
  const owner = fs.readFileSync(new URL("../../docs/app_architecture.md", import.meta.url), "utf8");
  const roles = owner.match(/\*\*Role nouns \(closed; extend only via component-registry review\):\*\* ([\s\S]*?)\./u);
  assert.ok(roles, "binding Role nouns paragraph is required");
  assert.deepEqual(roles[1].split(/,\s*/u).map((word) => word.trim()), roleNouns);
});

test("API axes and slots match the binding grammar", () => {
  const owner = fs.readFileSync(new URL("../../docs/app_architecture.md", import.meta.url), "utf8");
  const axes = owner.match(/\*\*Variants\.\*\*[\s\S]*?axis vocabulary([\s\S]*?)\. At/u);
  const slots = owner.match(/\*\*Slots\.\*\*([\s\S]*?);/u);
  assert.ok(axes && slots, "binding Variants and Slots paragraphs are required");
  const words = (text) => [...text.matchAll(/`(\w+)`/gu)].map((match) => match[1]);
  assert.deepEqual(words(axes[1]), componentAxes);
  assert.deepEqual(words(slots[1]), widgetSlotNames);
});

function scopeFamily() {
  const field = component("CatchField", "Field");
  field.contract = {members: [{
    id: "catch.field.geometry", symbol: "CatchFieldGeometryScope",
    file: `${home}catch_field_geometry_scope.dart`, level: "L3", roleNoun: "Scope",
    naming: {useCase: "FieldGeometry", comparedWith: [field.id],
      reason: "Publishes field gutter and paint geometry; the field owns rendering."},
    governance: {conceptRole: "member", conceptId: field.id, parentConceptId: field.id},
  }]};
  const source = declarations([field]);
  source[1].baseClass = "InheritedWidget";
  return {components: [field], source};
}

test("an inherited context member names its published contract and owning concept", () => {
  const {components, source} = scopeFamily();
  assert.ok(roleNouns.includes("Scope"));
  assert.deepEqual(problems(components, source), []);
  components[0].contract.members[0].naming.comparedWith = [];
  assert.match(problems(components, source).join("\n"), /Scope must name its published contract/u);
});

test("a visual widget cannot use Scope to evade its component role", () => {
  const {components, source} = scopeFamily();
  for (const baseClass of ["StatelessWidget", "StatefulWidget", "SingleChildRenderObjectWidget"]) {
    source[1].baseClass = baseClass;
    assert.match(problems(components, source).join("\n"), /Scope requires an inherited context Widget/u);
  }
});

test("an inherited publisher cannot be registered as a visual Surface", () => {
  const {components, source} = scopeFamily();
  const member = components[0].contract.members[0];
  member.symbol = source[1].name = "CatchFieldGeometrySurface";
  member.roleNoun = "Surface";
  member.file = source[1].file = `${home}catch_field_geometry_surface.dart`;
  assert.match(problems(components, source).join("\n"), /inherited context publication must use the Scope role/u);
});

test("Scope ownership remains required for a bare inherited publisher", () => {
  const scope = component("CatchScope", "Scope");
  const source = declarations([scope]);
  source[0].baseClass = "InheritedModel<String>";
  const result = problems([scope], source).join("\n");
  assert.match(result, /Scope must name its published contract/u);
  assert.doesNotMatch(result, /Scope requires an inherited context Widget/u);
});

test("schema rejects invented roles, levels, and unreviewed qualified names", () => {
  const schema = JSON.parse(fs.readFileSync(new URL(
    "../../design/components/catch.components.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020({strict: false});
  ajv.addSchema(schema);
  const role = ajv.getSchema(`${schema.$id}#/$defs/roleNoun`);
  const level = ajv.getSchema(`${schema.$id}#/$defs/componentLevel`);
  const naming = ajv.getSchema(`${schema.$id}#/$defs/widgetNaming`);
  assert.equal(role("Image"), true);
  assert.equal(role("Pill"), false);
  assert.equal(level("L4a"), true);
  assert.equal(level("L7"), false);
  assert.equal(naming({useCase: ""}), true);
  assert.equal(naming({useCase: "Selection"}), false);
  const reviewed = {useCase: "Selection", comparedWith: ["catch.menu"], reason: "Tracks one selected value."};
  assert.equal(naming(reviewed), true);
  assert.equal(naming({...reviewed, reason: " "}), false);
  assert.equal(naming({...reviewed, comparedWith: []}), false);
  assert.equal(naming({...reviewed, comparedWith: ["catch.menu", "catch.menu"]}), false);
  assert.equal(naming({...reviewed, uncheckedName: "CatchAnything"}), false);
});

test("role and use case derive the name independently of a contract id", () => {
  assert.equal(canonicalWidgetName({id: "catch.anything", roleNoun: "Menu",
    naming: {useCase: "Selection"}}), "CatchSelectionMenu");
  const renamed = component("CatchCommandPopup", "Menu");
  assert.match(problems([renamed]).join("\n"), /expected CatchMenu, found CatchCommandPopup/u);
});

test("a renamed competing primary cannot escape a collision with another id", () => {
  const menu = component("CatchMenu", "Menu");
  const competing = component("CatchCommandPopup", "Menu");
  assert.match(problems([menu, competing]).join("\n"), /canonical name collision CatchMenu/u);
});

test("an invented qualifier requires a concrete comparison, not just registration", () => {
  const menu = component("CatchMenu", "Menu");
  const competing = component("CatchCommandMenu", "Menu", {naming: {useCase: "Command"}});
  assert.match(problems([menu, competing]).join("\n"), /qualified use case requires comparedWith/u);
});

test("two reviewed menu entry points share one canonical implementation family", () => {
  assert.deepEqual(problems(menuFamily()), []);
});

test("a comparison must resolve to the same responsibility or the parent concept", () => {
  const family = menuFamily();
  const member = family[0].contract.members[0];
  for (const id of ["catch.missing", member.id]) {
    member.naming.comparedWith = [id];
    assert.match(problems(family).join("\n"), /comparison must name another existing contract/u);
  }
  const button = component("CatchButton", "Button");
  member.naming.comparedWith = [button.id];
  assert.match(problems([...family, button]).join("\n"), /must share its role or own its parent/u);
});

test("complementary image loading and grading may retain separate concepts", () => {
  const image = component("CatchImage", "Image");
  const grading = component("CatchGradedImage", "Image", {
    naming: {useCase: "Graded", comparedWith: [image.id],
      reason: "Applies color treatment to a supplied child; composes with the image loader."},
  });
  assert.deepEqual(problems([image, grading]), []);
});

test("version and cosmetic qualifiers cannot avoid a canonical-name decision", () => {
  const base = component("CatchButton", "Button");
  for (const useCase of ["Custom", "New", "Modern", "Legacy", "Old", "V2", "CompactV3"]) {
    const candidate = component(`Catch${useCase}Button`, "Button", {
      naming: {useCase, comparedWith: [base.id], reason: "Another implementation."},
    });
    assert.match(problems([base, candidate]).join("\n"), /implementation\/version escape/u);
  }
});

test("missing roles, missing levels and role substrings cannot satisfy grammar", () => {
  for (const roleNoun of [undefined, "Pill", "Imagery"]) {
    const entry = component("CatchImagery", roleNoun);
    assert.match(problems([entry]).join("\n"), /missing or unknown roleNoun/u);
  }
  const entry = component("CatchImagery", "Image", {level: undefined});
  const result = problems([entry]).join("\n");
  assert.match(result, /level must be L3/u);
  assert.match(result, /expected CatchImage, found CatchImagery/u);
});

test("wrong role on a valid name fails even if the word appears elsewhere", () => {
  const entry = component("CatchImageButton", "Image", {naming: {useCase: "Button"}});
  assert.match(problems([entry]).join("\n"), /expected CatchButtonImage, found CatchImageButton/u);
});

test("unregistered shared Widgets remain in the source inventory and fail", () => {
  const entry = component("CatchButton", "Button");
  assert.match(problems([], declarations([entry])).join("\n"), /expected one registry identity, found 0/u);
});

test("one physical heading cannot have both a contract and a duplicate member identity", () => {
  const section = component("CatchSection", "Section");
  const heading = component("CatchSectionHeaderTitle", "HeaderTitle", {
    naming: {useCase: "Section", comparedWith: [section.id],
      reason: "Owns heading semantics; the section owns grouping and placement."},
    governance: {conceptRole: "member", conceptId: section.id,
      parentConceptId: section.id, qualifier: "anatomy"},
  });
  const source = declarations([section, heading]);
  assert.deepEqual(problems([section, heading], source), []);
  section.contract = {members: [{
    ...heading, id: "catch.section.duplicate_title", symbol: heading.dart.symbol,
    file: heading.dart.file,
  }]};
  assert.match(problems([section, heading], source).join("\n"),
    /CatchSectionHeaderTitle: expected one registry identity, found 2/u);
});

test("a source rename or move fails stale registry identity", () => {
  const entry = component("CatchButton", "Button");
  const moved = declarations([entry]);
  moved[0].file = "packages/catch_ui/lib/src/primitives/catch_button.dart";
  assert.match(problems([entry], moved).join("\n"), /registry source .* differs from/u);
  assert.match(problems([entry], moved).join("\n"), /level must be L2/u);
  const renamed = declarations([entry]);
  renamed[0].name = "CatchNewButton";
  assert.match(problems([entry], renamed).join("\n"), /named Widget CatchButton is absent/u);
});

test("shared Widget declarations cannot hide outside the ladder directories", () => {
  const entry = component("CatchButton", "Button");
  const source = declarations([entry]);
  source[0].file = "packages/catch_ui/lib/other/catch_button.dart";
  assert.match(problems([entry], source).join("\n"), /outside a declared ladder home/u);
});

test("source filename names its primary Widget and permits governed anatomy", () => {
  const family = menuFamily();
  const menu = family[0];
  menu.contract.members.push({
    id: "catch.menu.row", symbol: "CatchMenuRow", level: "L3", roleNoun: "Row",
    naming: {useCase: "Menu", comparedWith: [menu.id],
      reason: "Renders one menu item; the parent owns collection and selection behavior."},
    governance: {conceptRole: "member", conceptId: menu.id,
      parentConceptId: menu.id, qualifier: "anatomy"},
  });
  assert.deepEqual(problems(family), []);
  menu.contract.members.at(-1).governance.conceptRole = "concept";
  assert.match(problems(family).join("\n"), /must be a member of the primary Widget's concept/u);
  menu.dart.file = `${home}catch_menu_helpers.dart`;
  assert.match(problems(family).join("\n"), /file must name exactly one primary public Widget/u);
});

test("deterministic diagnostics do not depend on source or registry ordering", () => {
  const a = component("CatchCommandPopup", "Menu");
  const b = component("CatchOtherPopup", "Menu");
  const source = declarations([a, b]);
  assert.deepEqual(problems([a, b], source), problems([b, a], source.reverse()));
});

test("async box and sliver protocols share one canonical role identity", () => {
  const async = component("CatchAsyncBoundary", "AsyncBoundary", {
    level: "L4a", dart: {symbol: "CatchAsyncBoundary", file: "lib/platform/riverpod_ui/catch_async_boundary.dart"},
  });
  assert.deepEqual(problems([async]), []);
  const competing = {...async, id: "catch.other_async"};
  assert.ok(problems([async, competing]).length > 0,
    "A second registry ID cannot authorize duplicate async-state ownership");
  const qualified = {...async, dart: {...async.dart, symbol: "CatchRiverpodAsyncBoundary"}};
  assert.ok(problems([qualified]).some(p => p.includes("expected CatchAsyncBoundary")));
});

test("the reserved prefix is Catch plus a capital, not the Catches product word", () => {
  const issues = (name, file) => featureWidgetNamingIssues({name, file, visibility: "public", classKind: "widget"});
  assert.deepEqual(issues("CatchesTopOverlay", "lib/swipes/presentation/catches_top_overlay.dart"), []);
  assert.ok(issues("CatchFooSection", "lib/swipes/presentation/catch_foo_section.dart")
    .includes("reserved-feature-widget-prefix"));
});

test("app-coupled shared widgets follow feature naming, and Workspace is a route suffix", () => {
  const issues = (name, file) => featureWidgetNamingIssues({name, file, visibility: "public", classKind: "widget"});
  assert.deepEqual(issues("CatchEventCard", "lib/contexts/events/parts/catch_event_card.dart"), ["reserved-feature-widget-prefix"]);
  assert.deepEqual(issues("EventCard", "lib/contexts/events/parts/event_card.dart"), []);
  assert.deepEqual(issues("SavedAudienceWorkspace", "lib/hosts/presentation/saved_audience_workspace.dart"), []);
  assert.deepEqual(issues("CatchAsyncBoundary", "lib/platform/riverpod_ui/catch_async_boundary.dart"), []);
});

test("off-vocabulary nouns name the role they are spelled as", () => {
  const redirects = {Panel: ["Section", "Surface"], Content: ["Body"]};
  assert.equal(roleNounRedirectAdvice("ProfilePanel", redirects), "Panel is spelled Section or Surface here");
  assert.equal(roleNounRedirectAdvice("ProfileSection", redirects), null);
});

test("Catch-prefixed symbols are reported outside the design-system homes only", () => {
  const source = [
    "class CatchMapMarker {}",
    "enum CatchMapType { normal }",
    "extension CatchLocalizationsBuildContext on Object {}",
    "class CatchesState {}",
    "typedef MapMarkerId = String;",
  ].join("\n");
  const found = topLevelDeclarations("lib/locations/shared/map.dart", source);
  assert.deepEqual(found.map((entry) => entry.kind), ["class", "enum", "extension", "class", "typedef"]);
  assert.deepEqual(reservedPrefixSymbolProblems(found).map((entry) => entry.name),
    ["CatchMapMarker", "CatchMapType", "CatchLocalizationsBuildContext"]);
  for (const home of ["lib/platform/riverpod_ui/x.dart", "packages/catch_ui/lib/src/x.dart", "lib/consumer_bootstrap.dart"]) {
    assert.deepEqual(reservedPrefixSymbolProblems(topLevelDeclarations(home, "class CatchThing {}")), []);
  }
});
