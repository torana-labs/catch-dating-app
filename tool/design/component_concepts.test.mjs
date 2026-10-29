#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import {
  collisionKeyFor,
  componentAliasIndex,
  componentAliasProblems,
  roleNounRedirectProblems,
  componentTierProblems,
  conceptMetrics,
  conceptTopologyProblems,
  newWidgetPolicyIssues,
  normalizeSymbol,
  publicWidgetNamingProblems,
  reactSymbolFiles,
} from "./component_concepts.mjs";

const primary = (id, symbol) => ({
  id,
  dart: {symbol},
  governance: {conceptRole: "concept", conceptId: id},
  contract: {members: []},
});

test("normalization deliberately forces comparable names into one namespace", () => {
  assert.equal(normalizeSymbol("CatchPrivacyBadge"), "privacy_badge");
  assert.equal(normalizeSymbol("PrivacyBadgeView"), "privacy_badge");
});

test("member collision keys resolve to the owning concept", () => {
  assert.equal(
    collisionKeyFor({conceptRole: "member", conceptId: "catch.badge", symbol: "CatchPrivacyBadge"}),
    "catch.badge",
  );
});

test("new app-coupled core widgets follow feature naming and stay registered", () => {
  assert.deepEqual(
    newWidgetPolicyIssues(
      {
        name: "ScreenShell",
        file: "lib/contexts/events/parts/screen_shell.dart",
        visibility: "public",
      },
      {
        widgetbookCovered: true,
        componentContracted: false,
      },
    ),
    ["noncanonical-feature-widget-name", "noncanonical-feature-widget-file", "missing-component-contract"],
  );
  assert.deepEqual(newWidgetPolicyIssues(
    {name: "CatchEventCard", file: "lib/contexts/events/parts/catch_event_card.dart", visibility: "public"},
    {widgetbookCovered: true, componentContracted: true}),
  ["reserved-feature-widget-prefix"]);
  assert.deepEqual(newWidgetPolicyIssues(
    {name: "EventCard", file: "lib/contexts/events/parts/event_card.dart", visibility: "public"},
    {widgetbookCovered: true, componentContracted: true}), []);
});

test("package widgets retain canonical names and required contracts", () => {
  assert.deepEqual(newWidgetPolicyIssues({
    name: "Surface", file: "packages/catch_ui/lib/src/primitives/surface.dart",
    visibility: "public",
  }, {widgetbookCovered: true, catalogMentioned: true, componentContracted: false}),
  ["noncanonical-core-widget-name", "missing-component-contract"]);
});

test("new private widgets remain a blocking destination", () => {
  assert.deepEqual(
    newWidgetPolicyIssues(
      {
        name: "_LocalShell",
        file: "lib/example/presentation/example.dart",
        visibility: "private",
      },
      {
        widgetbookCovered: false,
        componentContracted: false,
      },
    ),
    ["private-widget-class"],
  );
});

test("new shared package widgets and Riverpod adapters require registry identity", () => {
  for (const file of [
    "packages/catch_ui/lib/src/components/catch_button.dart",
    "lib/platform/riverpod_ui/catch_async_boundary.dart",
  ]) {
    const entry = {name: "CatchButton", file, visibility: "public"};
    assert.deepEqual(newWidgetPolicyIssues(entry, {
      widgetbookCovered: true, componentContracted: false,
    }), ["missing-component-contract"]);
    assert.deepEqual(newWidgetPolicyIssues(entry, {
      widgetbookCovered: true, componentContracted: true,
    }), []);
  }
});

test("feature widgets require preview coverage without becoming shared concepts", () => {
  const entry = {name: "ProfileSection", file: "lib/profile/presentation/profile_section.dart", visibility: "public"};
  assert.deepEqual(newWidgetPolicyIssues(entry, {
    widgetbookCovered: true, componentContracted: false,
  }), []);
  assert.deepEqual(newWidgetPolicyIssues(entry, {
    widgetbookCovered: false, componentContracted: false,
  }), ["missing-widgetbook"]);
});

test("ungoverned normalized names and exact public duplicates fail", () => {
  const base = {
    classKind: "widget",
    visibility: "public",
    conceptRole: "composition",
    conceptId: null,
    collisionKey: "screen_shell",
  };
  const problems = publicWidgetNamingProblems([
    {...base, name: "CatchScreenShell", file: "lib/core/a.dart"},
    {...base, name: "ScreenShellView", file: "lib/feature/b.dart"},
    {...base, name: "CatchScreenShell", file: "lib/feature/c.dart"},
  ]).join("\n");
  assert.match(problems, /ungoverned normalized widget collision screen_shell/u);
  assert.match(problems, /duplicate public widget class CatchScreenShell/u);
});

test("registered concept members may intentionally share a normalized collision", () => {
  assert.deepEqual(
    publicWidgetNamingProblems([
      {
        classKind: "widget",
        visibility: "public",
        name: "CatchBadge",
        file: "lib/core/badge.dart",
        conceptRole: "concept",
        conceptId: "catch.badge",
        collisionKey: "catch.badge",
      },
      {
        classKind: "widget",
        visibility: "public",
        name: "BadgeView",
        file: "lib/core/privacy_badge.dart",
        conceptRole: "member",
        conceptId: "catch.badge",
        collisionKey: "catch.badge",
      },
    ]),
    [],
  );
});

test("canonical and uncontracted public widgets cannot evade normalized collisions", () => {
  const rows = [
    {
      name: "CatchBadge",
      file: "packages/catch_ui/lib/src/components/catch_badge.dart",
      classKind: "widget",
      visibility: "public",
      conceptRole: "concept",
      conceptId: "catch.badge",
      collisionKey: collisionKeyFor({
        conceptRole: "concept",
        conceptId: "catch.badge",
        symbol: "CatchBadge",
      }),
    },
    {
      name: "BadgeView",
      file: "lib/features/badges/badge_view.dart",
      classKind: "widget",
      visibility: "public",
      conceptRole: "unclassified",
      conceptId: null,
      collisionKey: collisionKeyFor({
        conceptRole: "unclassified",
        conceptId: null,
        symbol: "BadgeView",
      }),
    },
  ];

  assert.deepEqual(publicWidgetNamingProblems(rows), [
    "ungoverned normalized widget collision badge: BadgeView, CatchBadge",
  ]);
});

test("exact public widget names collide across shared Consumer and Host roots", () => {
  const base = {
    name: "CatchCrossRootPanel",
    classKind: "widget",
    visibility: "public",
    conceptRole: "composition",
    conceptId: null,
  };

  assert.deepEqual(publicWidgetNamingProblems([
    {...base, file: "lib/contexts/events/parts/catch_cross_root_panel.dart"},
    {...base, file: "apps/consumer/lib/cross_root_panel.dart"},
    {...base, file: "apps/host/lib/cross_root_panel.dart"},
  ]), [
    "duplicate public widget class CatchCrossRootPanel: " +
      "apps/consumer/lib/cross_root_panel.dart, apps/host/lib/cross_root_panel.dart, " +
      "lib/contexts/events/parts/catch_cross_root_panel.dart",
  ]);
});

test("normalized public widget names collide across production roots", () => {
  const base = {
    classKind: "widget",
    visibility: "public",
    conceptRole: "composition",
    conceptId: null,
  };

  assert.deepEqual(publicWidgetNamingProblems([
    {
      ...base,
      name: "CatchCrossRootPanelWidget",
      file: "lib/contexts/events/parts/catch_cross_root_panel.dart",
    },
    {
      ...base,
      name: "CrossRootPanelView",
      file: "apps/consumer/lib/cross_root_panel.dart",
    },
  ]), [
    "ungoverned normalized widget collision cross_root_panel: " +
      "CatchCrossRootPanelWidget, CrossRootPanelView",
  ]);
});

test("one governed concept family may span all production roots", () => {
  const governed = {
    classKind: "widget",
    visibility: "public",
    conceptId: "catch.cross_root_panel",
  };

  assert.deepEqual(publicWidgetNamingProblems([
    {
      ...governed,
      name: "CatchCrossRootPanel",
      file: "lib/contexts/events/parts/catch_cross_root_panel.dart",
      conceptRole: "concept",
    },
    {
      ...governed,
      name: "CrossRootPanelView",
      file: "apps/consumer/lib/cross_root_panel.dart",
      conceptRole: "member",
    },
    {
      ...governed,
      name: "CrossRootPanelWidget",
      file: "apps/host/lib/cross_root_panel.dart",
      conceptRole: "member",
    },
  ]), []);
});

test("known-bad duplicate primaries and missing parents are rejected", () => {
  const bad = [
    primary("catch.badge", "CatchBadge"),
    {
      ...primary("catch.badge_alias", "CatchBadgeAlias"),
      governance: {conceptRole: "concept", conceptId: "catch.badge"},
    },
    {
      id: "catch.privacy_badge",
      dart: {symbol: "CatchPrivacyBadge"},
      governance: {
        conceptRole: "member",
        conceptId: "catch.missing",
        parentConceptId: "catch.missing",
      },
      contract: {members: []},
    },
  ];
  const problems = conceptTopologyProblems(bad).join("\n");
  assert.match(problems, /duplicate concept primary/u);
  assert.match(problems, /missing concept primary catch\.missing/u);
});

test("metrics count concepts rather than public contracts", () => {
  const components = [
    primary("catch.badge", "CatchBadge"),
    {
      id: "catch.privacy_badge",
      dart: {symbol: "CatchPrivacyBadge"},
      governance: {
        conceptRole: "member",
        conceptId: "catch.badge",
        parentConceptId: "catch.badge",
      },
      contract: {members: []},
    },
    {
      id: "catch.notification_row",
      dart: {symbol: "NotificationRow"},
      governance: {conceptRole: "composition"},
      contract: {members: []},
    },
  ];
  assert.deepEqual(
    conceptMetrics(components),
    {
      contractCount: 3,
      publicClassCount: 3,
      conceptCount: 1,
      memberCount: 1,
      membersPerConcept: 1,
      unclassifiedCount: 0,
      byConceptRole: {composition: 1, concept: 1, member: 1},
      collisionCount: 1,
      collisions: [{key: "catch.badge", symbols: ["CatchBadge", "CatchPrivacyBadge"]}],
      naming: {
        canonicalConceptNames: 1,
        documentedConceptNameExceptions: 0,
        undocumentedConceptNameExceptions: 0,
      },
    },
  );
});

test("feature previews cannot bypass reserved prefixes, role names or file suffixes", () => {
  const covered = {widgetbookCovered: true, componentContracted: true};
  const base = {file: "lib/profile/presentation/profile_section.dart", visibility: "public"};
  assert.deepEqual(newWidgetPolicyIssues({...base, name: "CatchProfileSection"}, covered),
    ["reserved-feature-widget-prefix"]);
  assert.deepEqual(newWidgetPolicyIssues({...base, name: "ProfilePanel"}, covered),
    ["noncanonical-feature-widget-name"]);
  assert.deepEqual(newWidgetPolicyIssues({...base, name: "Section"}, covered),
    ["noncanonical-feature-widget-name"]);
  assert.deepEqual(newWidgetPolicyIssues({...base, name: "ProfileSection", file: "lib/profile/presentation/profile.dart"}, covered),
    ["noncanonical-feature-widget-file"]);
  assert.deepEqual(newWidgetPolicyIssues({...base, name: "ProfileScreen", file: "lib/profile/presentation/profile_screen.dart"}, covered), []);
});

test("parity tiers are required, keep React implementations off Flutter-only entries, and never widen a member", () => {
  const entry = (id, tier, extra = {}) => ({
    id, tier, dart: {symbol: "CatchThing"},
    governance: {conceptRole: "concept", conceptId: id}, ...extra,
  });
  const headless = {symbol: "ButtonControl", file: "packages/web-ui/src/primitives.tsx", api: "headless-control"};
  assert.deepEqual(componentTierProblems([
    entry("catch.button", "T1", {dart: {symbol: "CatchButton"}, react: headless}),
    entry("catch.sheet", "T3"),
  ]), []);
  assert.deepEqual(componentTierProblems([entry("catch.thing", undefined)]),
    ["catch.thing: tier must be one of T1, T2, T3, T4"]);
  assert.deepEqual(componentTierProblems([
    entry("catch.sheet", "T3", {dart: {symbol: "CatchSheet"}, react: {...headless, symbol: "SheetControl"}}),
  ]), ["catch.sheet: T3 entries are Flutter-only but declare React implementation SheetControl; promote to T2 through registry review"]);
  assert.deepEqual(componentTierProblems([
    entry("catch.button", "T1", {dart: {symbol: "CatchButton"}, react: {...headless, api: "styled"}}),
  ]), ["catch.button: styled React implementation ButtonControl must use the Flutter symbol CatchButton"]);
  assert.deepEqual(componentTierProblems([
    entry("catch.button", "T1", {dart: {symbol: "CatchButton"}, react: {...headless, api: "styled", symbol: "CatchButton"}}),
  ]), []);
  const member = {
    id: "catch.privacy_badge", tier: "T1", dart: {symbol: "CatchPrivacyBadge"},
    governance: {conceptRole: "member", conceptId: "catch.badge", parentConceptId: "catch.badge"},
  };
  assert.deepEqual(componentTierProblems([entry("catch.badge", "T2"), member]),
    ["catch.privacy_badge: member tier T1 is wider than parent catch.badge tier T2"]);
  assert.deepEqual(componentTierProblems([entry("catch.badge", "T1"), {...member, tier: "T3"}]), []);
});

test("styled React records find each additional symbol in its own file", () => {
  assert.deepEqual(reactSymbolFiles({
    symbol: "CatchPageBody", file: "packages/web-ui/src/components/CatchPageBody.tsx",
    api: "styled", additionalSymbols: ["CatchGap"],
  }), [
    ["CatchPageBody", "packages/web-ui/src/components/CatchPageBody.tsx"],
    ["CatchGap", "packages/web-ui/src/components/CatchGap.tsx"],
  ]);
  assert.deepEqual(reactSymbolFiles({
    symbol: "TextInputControl", file: "packages/web-ui/src/primitives.tsx",
    api: "headless-control", additionalSymbols: ["SelectControl"],
  }), [
    ["TextInputControl", "packages/web-ui/src/primitives.tsx"],
    ["SelectControl", "packages/web-ui/src/primitives.tsx"],
  ]);
});

test("T1 and T2 design-system props declare a React type beside the Dart one", () => {
  const contract = (tier, level, props) => ({
    id: "catch.thing", tier, level, dart: {symbol: "CatchThing"},
    governance: {conceptRole: "concept", conceptId: "catch.thing"}, contract: {props},
  });
  const valid = [
    {name: "label", type: "string", required: true, dartType: "String", tsType: "string"},
    {name: "tone", type: "enum", required: false, dartType: "CatchThingTone", tsType: "CatchThingTone"},
    {name: "fit", type: "enum", required: false, dartType: "BoxFit", values: ["cover", "contain"], tsType: "\"cover\" | \"contain\""},
    {name: "onPressed", type: "callback", required: true, dartType: "VoidCallback?", tsType: "(() => void) | null"},
    {name: "leading", type: "widget", required: false, dartType: "Widget?", tsType: "ReactNode"},
    {name: "focusNode", type: "object", required: false, dartType: "FocusNode?", tsType: null},
    {name: "itemKeyBuilder", type: "callback", required: false, dartType: "Key? Function(T value)?", tsType: null},
    {name: "gap", type: "number", required: false, dartType: "double", token: "gap", tsType: "CatchGapSize"},
    {name: "padding", type: "object", required: false, dartType: "EdgeInsetsGeometry", token: "inset", tsType: "CatchInsetPadding"},
    {name: "pt", type: "number", required: false, dartType: "double?", token: "space", tsType: "CatchSpacingStep"},
  ];
  assert.deepEqual(componentTierProblems([contract("T1", "L3", valid)]), []);
  assert.deepEqual(componentTierProblems([contract("T1", "L3", [
    {name: "label", type: "string", required: true, dartType: "String"},
    {name: "tone", type: "enum", required: false, dartType: "CatchThingTone", tsType: "ThingTone"},
    {name: "onPressed", type: "callback", required: true, dartType: "VoidCallback?", tsType: "string"},
    {name: "leading", type: "widget", required: false, dartType: "Widget?", tsType: "JSX.Element"},
    {name: "color", type: "color", required: false, dartType: "Color?", tsType: null},
    {name: "focusNode", type: "object", required: false, dartType: "FocusNode?", tsType: "HTMLElement"},
    {name: "gap", type: "number", required: false, dartType: "double", token: "gap", tsType: "number"},
    {name: "radius", type: "number", required: false, dartType: "double", token: "radius", tsType: "number"},
  ])]), [
    "catch.thing.color: tsType null is reserved for Flutter mechanisms, not Color?",
    "catch.thing.focusNode: FocusNode? is a Flutter mechanism; its tsType must be null",
    "catch.thing.gap: gap token tsType must be CatchGapSize",
    "catch.thing.label: T1/T2 prop needs a tsType beside dartType String",
    "catch.thing.leading: widget tsType must render ReactNode",
    "catch.thing.onPressed: callback tsType must be a function type",
    "catch.thing.radius: token must be one of gap, inset, space",
    "catch.thing.tone: enum tsType must be CatchThingTone",
  ]);
  const flutterOnly = [{name: "label", type: "string", required: true, dartType: "String", tsType: "string"}];
  for (const [tier, level] of [["T3", "L3"], ["T4", "L3"], ["T2", "L5"], ["T2", "L6"]]) {
    assert.deepEqual(componentTierProblems([contract(tier, level, flutterOnly)]),
      ["catch.thing.label: tsType is only declared on T1/T2 contracts at L2, L3, L4"]);
  }
});

const aliasRegistry = [{
  id: "catch.event_card",
  dart: {symbol: "EventCard", file: "lib/events/shared/event_tiles/event_card.dart"},
  aliases: ["EventTicket", "EventTile"],
  contract: {members: [{id: "catch.event_card.thumbnail", symbol: "EventThumbnail",
    file: "lib/contexts/events/parts/event_thumbnail.dart", aliases: ["EventImageThumb"]}]},
}];

test("a new widget named like a registered component or alias points at it", () => {
  const index = componentAliasIndex(aliasRegistry);
  const covered = {widgetbookCovered: true, componentContracted: true};
  const fresh = {name: "EventTicket", file: "lib/explore/presentation/widgets/event_ticket.dart", visibility: "public"};
  assert.deepEqual(newWidgetPolicyIssues(fresh, {...covered, registeredOwner: index.get(normalizeSymbol(fresh.name))}),
    ["duplicate-of-registered-component"]);
  assert.equal(index.get(normalizeSymbol("CatchEventCard")).id, "catch.event_card");
  assert.equal(index.get(normalizeSymbol("EventImageThumb")).symbol, "EventThumbnail");
  const owner = {name: "EventCard", file: "lib/events/shared/event_tiles/event_card.dart", visibility: "public"};
  assert.deepEqual(newWidgetPolicyIssues(owner, {...covered, registeredOwner: index.get(normalizeSymbol(owner.name))}), []);
});

test("aliases are unique, never shadow a symbol, and never a bare role noun", () => {
  assert.deepEqual(componentAliasProblems(aliasRegistry), []);
  const broken = [
    {...aliasRegistry[0], aliases: ["Card", "EventCard", "EventThumbnail"]},
    {id: "catch.ticket", dart: {symbol: "CatchTicket", file: "packages/catch_ui/lib/src/components/catch_ticket.dart"},
      aliases: ["EventTile"]},
    {id: "catch.other", dart: {symbol: "OtherTile", file: "lib/other/other_tile.dart"}, aliases: ["EventTile"]},
  ];
  assert.deepEqual(componentAliasProblems(broken), [
    "catch.event_card: alias Card is a bare role noun",
    "catch.event_card: alias EventCard repeats its own symbol",
    "catch.event_card: alias EventThumbnail names registered symbol of catch.event_card.thumbnail",
    "catch.other: alias EventTile is also an alias of catch.ticket",
  ]);
});

test("role-noun redirects name only off-vocabulary nouns and real roles", () => {
  assert.deepEqual(roleNounRedirectProblems({Panel: ["Section", "Surface"]}), []);
  assert.deepEqual(roleNounRedirectProblems({Card: ["Surface"], Panel: ["Pane"]}), [
    "roleNounRedirects.Card: already a role noun",
    "roleNounRedirects.Panel: target Pane is not a role noun",
  ]);
});

test("normalization only strips the reserved prefix, not the Catches product word", () => {
  assert.equal(normalizeSymbol("CatchEventCard"), "event_card");
  assert.equal(normalizeSymbol("CatchesTopOverlay"), "catches_top_overlay");
});
