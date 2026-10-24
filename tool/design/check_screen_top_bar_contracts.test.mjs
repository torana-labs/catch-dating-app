import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkScreenTopBarContracts} from "./check_screen_top_bar_contracts.mjs";

test("accepts registered app-bar, root-screen, geometry, and hero contracts", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'July 2026'));",
    contract: screenContract(),
    rawSource: "Widget build() => SliverAppBar();",
    rawChromeExceptions: [heroException()],
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
  assert.equal(result.rootHeaderCount, 1);
  assert.equal(result.rawChromeCount, 1);
});

test("accepts canonical route-scaffold top-bar builders", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: 'Review history',
          navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: compactContract({
      leading: "back",
      surface: "CatchRouteScaffold",
    }),
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("accepts screen-title route-scaffold top-bar builders", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.screen(
          context: context,
          title: 'Customer name',
          navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: {
      ...screenContract(),
      leading: "back",
      surface: "CatchRouteScaffold",
    },
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("flags geometry overrides on compact route bars", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: 'Sunday Padel',
          subtitle: 'Event recap',
          height: CatchTopBar.heightFor(
            context: context,
            hasSubtitle: true,
          ),
          navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: compactContract({
      leading: "back",
      surface: "CatchRouteScaffold",
    }),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "compact-chrome-geometry-override"));
});

test("flags a compact route that bypasses the shared title widget", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          body: Text(
            'Dress rehearsal',
            style: CatchTextStyles.titleL(context),
          ),
          navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: compactContract({
      leading: "back",
      surface: "CatchRouteScaffold",
    }),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "route-title-widget-bypass"));
});

test("flags a workspace route that bypasses the shared title widget", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          body: PrivateWorkspaceTitle(),
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: workspaceContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "route-title-widget-bypass"));
});

test("flags a workspace route that retains the invalid eyebrow hierarchy", () => {
  const root = fixtureRoot({
    source: `
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: 'Sunday Evening Run',
          eyebrow: 'Event preparation',
          emphasis: scrolledUnder ? CatchTopBarEmphasis.divided : CatchTopBarEmphasis.plain,
        ),
        body: ListView(),
      );
    `,
    contract: workspaceContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "route-title-role-override"));
});

test("rejects a feature-selected typography variant", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.route(
      title: profile.name,
      variant: CatchTopBarVariant.identity,
    ));`,
    contract: compactContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "route-title-role-override"));
});

test("names and route labels share one title family without a variant", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.route(title: profile?.name ?? 'Profile'));`,
    contract: compactContract(),
  });
  assert.deepEqual(checkScreenTopBarContracts({root}).findings, []);
});

test("rejects retired eyebrow and geometry combinations", () => {
  for (const input of ["eyebrow: 'Event recap'", "kicker: 'RECAP'", "mode: CatchTopBarMode.content", "size: CatchTopBarSize.compact"]) {
    const root = fixtureRoot({
      source: `Scaffold(appBar: CatchTopBar.route(title: 'Event recap', ${input}));`,
      contract: compactContract(),
    });
    assert.ok(hasFinding(checkScreenTopBarContracts({root}), "route-title-role-override"));
  }
});

test("flags a route contract that drops its canonical surface", () => {
  const root = fixtureRoot({
    source: `
      Scaffold(
        appBar: CatchTopBar.route(
          title: 'Review history',
          navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
        ),
        body: ListView(),
      );
    `,
    contract: compactContract({
      leading: "back",
      surface: "CatchRouteScaffold",
    }),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "missing-route-scaffold-surface"));
});

test("resolves canonical root chrome owned by a StatefulWidget state", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Fallback'));",
    contract: screenContract(),
    rootSurface: rootSurface({owner: "CatchTopBar.screen"}),
    rootSource: `
      class RootHeader extends StatefulWidget {
        State<RootHeader> createState() => _RootHeaderState();
      }
      class _RootHeaderState extends State<RootHeader> {
        Widget build(BuildContext context) =>
          CatchTopBar.screen(title: 'Chats');
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("accepts the typed root header as the canonical title owner", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Fallback'));",
    contract: screenContract(),
    rootSurface: rootSurface({owner: "CatchRootScreenHeader.title"}),
    rootSource: `
      class RootHeader {
        Widget build() => CatchRootScreenScaffold.withPrimaryRail(
          header: const CatchRootScreenHeader.title(title: 'Profile'),
          actions: rail,
          body: body,
        );
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("flags a direct pill action in canonical top-bar actions", () => {
  const root = fixtureRoot({
    source: `Scaffold(
      appBar: CatchTopBar.screen(
        title: 'Calendar',
        actions: [CatchButton(label: 'Today', onPressed: selectToday)],
      ),
    );`,
    contract: screenContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "top-bar-direct-pill-action"));
});

test("flags a direct pill hidden behind a local top-bar action list", () => {
  const root = fixtureRoot({
    source: `Widget build() {
      final headerActions = [
        CatchButton(label: 'Add customer', onPressed: addCustomer),
      ];
      return Scaffold(
        appBar: CatchTopBar.screen(
          title: 'Customers',
          actions: headerActions,
        ),
      );
    }`,
    contract: screenContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "top-bar-direct-pill-action"));
});

test("accepts the canonical text recipe in top-bar actions", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.screen(
      title: 'Events',
      actions: [CatchButton.text(label: 'Done', onPressed: save)],
    ));`,
    contract: screenContract(),
  });
  assert.deepEqual(checkScreenTopBarContracts({root}).findings, []);
});

test("flags named pill recipes in top-bar actions", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.screen(
      title: 'Events',
      actions: [CatchButton.floating(label: 'Map', onPressed: showMap)],
    ));`,
    contract: screenContract(),
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "top-bar-direct-pill-action"));
});

test("accepts the canonical adaptive primary top-bar action", () => {
  const root = fixtureRoot({
    source: `Scaffold(
      appBar: CatchTopBar.screen(
        title: 'Events',
        actions: [
          CatchTopBarPrimaryButton(
            label: 'Create event',
            icon: CatchIcons.addRounded,
            onPressed: createEvent,
          ),
        ],
      ),
    );`,
    contract: screenContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("flags every noncanonical surface inside an aligned root adopter", () => {
  const trackedPath = "lib/root/chats_browse_header.dart";
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    trackedRootSources: [
      {
        path: trackedPath,
        source: `
          class ChatsBrowseHeader extends StatelessWidget {
            Widget build(BuildContext context) =>
              CatchTopBar.screen(title: 'Chats');
          }
          class ChatsLegacyTopBar extends StatelessWidget {
            Widget build(BuildContext context) => Text(
              'Chats',
              style: CatchTextStyles.headline(context),
            );
          }
        `,
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "tracked-root-header-noncanonical-owner"));
});

test("flags the known-bad screen fixture when compact chrome replaces the screen title voice", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Calendar'));",
    contract: screenContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "wrong-app-bar-expression"));
  assert.ok(hasFinding(result, "missing-canonical-owner"));
});

test("flags a new app bar until its screen-chrome role is registered", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    extraSource: "Scaffold(appBar: CatchTopBar.route(title: 'New route'));",
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "unregistered-app-bar" &&
        finding.path === "lib/new/new_screen.dart",
    ),
  );
});

test("flags a raw Material app bar even when a manifest entry tries to bless it", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: AppBar(title: const Text('Calendar')));",
    contract: screenContract({expression: "AppBar", owner: "AppBar"}),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "role-owner-drift"));
  assert.ok(hasFinding(result, "role-expression-drift"));
  assert.ok(hasFinding(result, "unregistered-raw-chrome"));
});

test("does not let workspace and raw-exception entries bless Material AppBar", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: AppBar(title: const Text('Workspace')));",
    contract: {
      path: "lib/calendar/calendar_screen.dart",
      role: "workspace",
      expression: "AppBar",
      owner: "AppBar",
      reason: "This deliberately adversarial workspace entry has a reason.",
    },
    rawChromeExceptions: [
      {
        path: "lib/calendar/calendar_screen.dart",
        expression: "AppBar",
        occurrences: 1,
        reason: "This deliberately adversarial raw exception has a reason.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "workspace-owner-drift"));
  assert.ok(hasFinding(result, "workspace-raw-expression"));
  assert.ok(hasFinding(result, "invalid-raw-hero-expression"));
});

test("does not let a compact contract bless raw chrome", () => {
  const root = fixtureRoot({
    source: `
      Widget decoy() => CatchTopBar.route(title: 'Elsewhere');
      Widget build() => Scaffold(appBar: AppBar(title: const Text('Raw')));
    `,
    contract: compactContract({expression: "AppBar"}),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "role-expression-drift"));
  assert.ok(hasFinding(result, "missing-canonical-owner"));
});

test("does not count a canonical call outside a helper-owned appBar", () => {
  const root = fixtureRoot({
    source: `
      PreferredSizeWidget helper() => AppBar(title: const Text('Raw'));
      Widget decoy() => CatchTopBar.route(title: 'Elsewhere');
      Widget build() => Scaffold(appBar: helper());
    `,
    contract: compactContract({expression: "helper"}),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "role-expression-drift"));
  assert.ok(hasFinding(result, "missing-canonical-owner"));
});

test("flags every root-screen branch that lacks a root-header contract", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    rootHeaders: [],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "missing-root-headers"));
  assert.ok(hasFinding(result, "unregistered-root-header"));
});

test("flags a custom root-screen header that does not delegate to the canonical owner", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    rootSource: `
      class RootHeader {
        Widget build() => Text('Today', style: CatchTextStyles.headlineS(context));
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "missing-root-header-owner"));
  assert.ok(hasFinding(result, "local-root-title-style"));
});

test("flags root-header text-scale and geometry overrides", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    rootSurface: rootSurface({owner: "CatchTopBar.screen"}),
    rootSource: `
      class RootHeader {
        Widget build() => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1)),
          child: CatchTopBar.screen(
            title: 'Chats',
            height: 56,
            contentPadding: EdgeInsets.zero,
          ),
        );
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "root-title-text-scale-override"));
  assert.ok(hasFinding(result, "root-header-geometry-override"));
});

test("flags local geometry on a screen-role Scaffold app bar", () => {
  const root = fixtureRoot({
    source: `
      Scaffold(
        appBar: CatchTopBar.screen(
          title: 'Calendar',
          contentPadding: EdgeInsets.zero,
        ),
      );
    `,
    contract: screenContract(),
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "screen-chrome-geometry-override"));
});

test("flags raw sliver chrome until a durable hero exception is registered", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    rawSource: "Widget build() => SliverAppBar();",
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "unregistered-raw-chrome"));
});

test("flags an aliased or non-zero canonical screen-title inset", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));",
    contract: screenContract(),
    tokenSource:
      "static const EdgeInsets screenTitleBlock = pageHeaderCompact;",
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "screen-geometry-not-owned"));
});

test("accepts an app-bar-only ownership manifest", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Edit photo'));",
    contract: compactContract(),
    includeRootContracts: false,
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
  assert.equal(result.rootHeaderCount, 0);
});

test("flags a pushed compact route that suppresses its required back action", () => {
  const root = fixtureRoot({
    source:
      "Scaffold(appBar: CatchTopBar.route(title: 'Host profile', navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.none)));",
    contract: compactContract({leading: "back"}),
    includeRootContracts: false,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "missing-required-back-navigation"));
});

test("accepts an explicit back action on a pushed compact route", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.route(
      title: 'Host profile',
      navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back),
    ));`,
    contract: compactContract({leading: "back"}),
    includeRootContracts: false,
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("accepts back navigation that is suppressed only when embedded", () => {
  const root = fixtureRoot({
    source: `CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: 'Customer',
        navigation: CatchTopBarNavigation(mode: widget.embedded
            ? CatchTopBarNavigationMode.none
            : CatchTopBarNavigationMode.back),
      ),
      body: ListView(),
    );`,
    contract: compactContract({
      leading: "backUnlessEmbedded",
      surface: "CatchRouteScaffold",
    }),
    includeRootContracts: false,
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("flags a shell-covering editor pushed on a branch navigator", () => {
  const root = fixtureRoot({
    source: `
      Future<void> openEditor({required BuildContext context}) async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => Screen()));
      }
      Widget build() => Scaffold(appBar: CatchTopBar.route(title: 'Edit photo'));
    `,
    contract: compactContract(),
    includeRootContracts: false,
    routePresentations: [
      {
        path: "lib/calendar/calendar_screen.dart",
        symbol: "openEditor",
        navigator: "root",
        reason: "The full-screen editor must cover shell navigation chrome.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "route-under-shell-chrome"));
});

test("accepts a shell-covering editor pushed on the root navigator", () => {
  const root = fixtureRoot({
    source: `
      Future<void> openEditor({required BuildContext context}) async {
        await Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute(builder: (_) => Screen()),
        );
      }
      Widget build() => Scaffold(appBar: CatchTopBar.route(title: 'Edit photo'));
    `,
    contract: compactContract(),
    includeRootContracts: false,
    routePresentations: [
      {
        path: "lib/calendar/calendar_screen.dart",
        symbol: "openEditor",
        navigator: "root",
        reason: "The full-screen editor must cover shell navigation chrome.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("preserves content-header classification for the equivalent CatchText role", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(), includeRootContracts: false,
    manualSource: `class FeatureHeader extends StatelessWidget {
      Widget build(BuildContext context) => ui.CatchText(
        'Module', variant: ui.CatchTextVariant.titleL,
      );
    }`,
    manualHeaders: [{path: "lib/manual/header.dart", symbol: "FeatureHeader", role: "content",
      owner: "CatchTextStyles.titleL", reason: "This exact header labels content inside the route body."}],
  });
  assert.deepEqual(checkScreenTopBarContracts({root}).findings, []);
});

for (const role of ["headline", "titleL"]) test(`discovers unregistered CatchText ${role} headers`, () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(), includeRootContracts: false,
    manualSource: `class FeatureHeader extends StatelessWidget {
      Widget build(BuildContext context) => CatchText('Feature', variant: CatchTextVariant.${role});
    }`,
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "unregistered-manual-header"));
});

for (const [role, navigation, finding] of [
  ["screen", false, "manual-header-role-owner-drift"],
  ["content", true, "content-header-owns-navigation"],
]) test(`CatchText preserves ${finding} enforcement`, () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(), includeRootContracts: false,
    manualSource: `class FeatureHeader extends StatelessWidget {
      Widget build(BuildContext context) => Row(children: [
        ${navigation ? 'CatchIconAction.icon(icon: CatchIcons.arrowBackRounded),' : ''}
        CatchText('Feature', variant: CatchTextVariant.titleL),
      ]);
    }`,
    manualHeaders: [{path: "lib/manual/header.dart", symbol: "FeatureHeader", role,
      owner: "CatchTextStyles.titleL", reason: "This fixture must retain semantic classification enforcement."}],
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), finding));
});

test("CatchText cannot disguise a local root-title typography override", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.screen(title: 'Calendar'));", contract: screenContract(),
    rootSource: `class RootHeader {
      Widget build() => CatchText('Today', variant: CatchTextVariant.headline);
    }`,
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "local-root-title-style"));
});

test("unrelated and nested variant tokens cannot impersonate header typography", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(), includeRootContracts: false,
    manualSource: `class FeatureHeader extends StatelessWidget {
      final decoy = CatchTextVariant.titleL;
      Widget build() => CatchText('Copy', variant: CatchTextVariant.bodyM,
        color: resolve(variant: CatchTextVariant.titleL));
    }`,
    manualHeaders: [{path: "lib/manual/header.dart", symbol: "FeatureHeader", role: "content",
      owner: "CatchTextStyles.titleL", reason: "No actual header typography is rendered by this fixture."}],
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "stale-manual-header-contract"));
});

test("flags an unregistered body-owned manual screen header", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    manualSource: `
      class FeatureHeader extends StatelessWidget {
        Widget build(BuildContext context) => Text(
          'Feature',
          style: CatchTextStyles.headline(context),
        );
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "unregistered-manual-header"));
});

test("accepts an exact content-header classification", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    manualSource: `
      class FeatureHeader extends StatelessWidget {
        Widget build(BuildContext context) => Text(
          'Module',
          style: CatchTextStyles.titleL(context),
        );
      }
    `,
    manualHeaders: [
      {
        path: "lib/manual/header.dart",
        symbol: "FeatureHeader",
        role: "content",
        owner: "CatchTextStyles.titleL",
        reason: "This exact header labels content inside the route body.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
});

test("flags a manual screen role backed by content title styling", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    manualSource: `
      class FeatureHeader extends StatelessWidget {
        Widget build(BuildContext context) => Text(
          'Feature',
          style: CatchTextStyles.titleL(context),
        );
      }
    `,
    manualHeaders: [
      {
        path: "lib/manual/header.dart",
        symbol: "FeatureHeader",
        role: "screen",
        owner: "CatchTextStyles.titleL",
        reason: "This invalid role must not promote content styling.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "manual-header-role-owner-drift"));
});

test("does not let a navigation header hide legacy debt as content", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    manualSource: `
      class FeatureHeader extends StatelessWidget {
        Widget build(BuildContext context) => Row(children: [
          CatchIconAction.icon(icon: CatchIcons.arrowBackRounded),
          Text('Feature', style: CatchTextStyles.titleL(context)),
        ]);
      }
    `,
    manualHeaders: [
      {
        path: "lib/manual/header.dart",
        symbol: "FeatureHeader",
        role: "content",
        owner: "CatchTextStyles.titleL",
        reason: "This invalid content role still owns route navigation.",
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "content-header-owns-navigation"));
});

test("discovers canonical root chrome delegated through StatefulWidget State", () => {
  const trackedPath = "lib/root/chats_browse_header.dart";
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    trackedRootSources: [
      {
        path: trackedPath,
        source: `
          class ChatsBrowseHeader extends StatefulWidget {
            State<ChatsBrowseHeader> createState() => _ChatsBrowseHeaderState();
          }
          class _ChatsBrowseHeaderState extends State<ChatsBrowseHeader> {
            Widget build(BuildContext context) =>
              CatchTopBar.screen(title: 'Chats');
          }
        `,
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
  assert.equal(result.trackedRootHeaderPathCount, 1);
  assert.equal(result.trackedRootSurfaceCount, 1);
});

test("discovers a canonical root HeaderContent surface", () => {
  const trackedPath = "lib/root/explore_header.dart";
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    trackedRootSources: [
      {
        path: trackedPath,
        source: `
          class ExploreBrowseHeaderContent extends StatelessWidget {
            Widget build(BuildContext context) =>
              CatchTopBar.primaryRail(title: 'Explore');
          }
        `,
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.deepEqual(result.findings, []);
  assert.equal(result.trackedRootSurfaceCount, 1);
});

test("flags a tracked root Screen that drops its canonical owner", () => {
  const trackedPath = "lib/root/dashboard_home_screen.dart";
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    trackedRootSources: [
      {
        path: trackedPath,
        source: `
          class DashboardHomeScreen extends StatelessWidget {
            Widget build(BuildContext context) =>
              CatchTopBar.route(title: 'Home');
          }
        `,
      },
    ],
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(hasFinding(result, "tracked-root-header-missing-owner"));
});

test("canonical scaffold title is checked as screen chrome", () => {
  const root = fixtureRoot({
    source: "CatchScaffold.workspace(title: CatchTopBar.route(title: 'Details'), body: Text('Body'));",
    contract: compactContract(),
    includeRootContracts: false,
  });
  assert.deepEqual(checkScreenTopBarContracts({root}).findings, []);
});

for (const source of [
  "CatchScaffold.workspace(body: CatchTopBar.route(title: 'Nested title'));",
  "CatchSection(title: CatchTopBar.route(title: 'Other component'));",
]) {
  test(`a nested or unrelated title does not satisfy screen chrome: ${source}`, () => {
    const root = fixtureRoot({source, contract: compactContract(), includeRootContracts: false});
    assert.ok(hasFinding(checkScreenTopBarContracts({root}), "missing-app-bar"));
  });
}

test("unregistered canonical scaffold titles remain violations", () => {
  const root = fixtureRoot({
    source: "CatchScaffold.workspace(title: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
  });
  write(root, "lib/unregistered.dart", "CatchScaffold.workspace(title: CatchTopBar.route(title: 'Rogue')); ");
  const result = checkScreenTopBarContracts({root});
  assert.ok(result.findings.some((finding) => finding.code === "unregistered-app-bar" && finding.path === "lib/unregistered.dart"));
});

test("exempts only the canonical CatchScaffold app-bar forwarder", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    canonicalScaffoldSource: `
      class CatchScaffold extends StatelessWidget {
        final PreferredSizeWidget? title;
        final Widget body;

        Widget build(BuildContext context) {
          return Scaffold(appBar: title, body: body);
        }
      }

      class RogueInfrastructureWidget extends StatelessWidget {
        Widget build(BuildContext context) =>
          Scaffold(appBar: CatchTopBar.route(title: 'Rogue'));
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "unregistered-app-bar" &&
        finding.path === "packages/catch_ui/lib/src/patterns/catch_scaffold.dart",
    ),
  );
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "canonical-screen-scaffold-app-bar-drift",
    ),
    false,
  );
});

test("fails closed when the canonical app-bar forwarder drifts", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
    contract: compactContract(),
    includeRootContracts: false,
    canonicalScaffoldSource: `
      class CatchScaffold extends StatelessWidget {
        final PreferredSizeWidget? title;
        final Widget body;

        Widget build(BuildContext context) {
          return Scaffold(appBar: resolveAppBar(title), body: body);
        }
      }
    `,
  });

  const result = checkScreenTopBarContracts({root});

  assert.ok(
    hasFinding(result, "canonical-screen-scaffold-app-bar-drift"),
  );
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "unregistered-app-bar" &&
        finding.path === "packages/catch_ui/lib/src/patterns/catch_scaffold.dart",
    ),
  );
});

for (const [label, height, child, fallback, valid] of [
  ["canonical scaled forwarding", "scaled.preferredSizeFor(context)", "scaled", "bar", true],
  ["replacement child", "scaled.preferredSizeFor(context)", "rogueBar", "bar", false],
  ["fixed scaled height", "const Size.fromHeight(44)", "scaled", "bar", false],
  ["replacement fallback", "scaled.preferredSizeFor(context)", "scaled", "rogueBar", false],
]) {
  test(`scaled scaffold app-bar boundary: ${label}`, () => {
    const root = fixtureRoot({
      source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
      contract: compactContract(),
      includeRootContracts: false,
      canonicalScaffoldSource: `
        class CatchScaffold extends StatelessWidget {
          final PreferredSizeWidget? title;
          Widget build(BuildContext context) {
            return Scaffold(appBar: switch (title) {
              final CatchScaledPreferredSize scaled => PreferredSize(
                preferredSize: ${height}, child: ${child},
              ),
              final bar => ${fallback},
            });
          }
        }
      `,
    });
    const result = checkScreenTopBarContracts({root});
    assert.equal(hasFinding(result, "canonical-screen-scaffold-app-bar-drift"), !valid);
  });
}

for (const [label, width, child, valid] of [
  ["actual bounded width", "constraints.hasBoundedWidth ? constraints.maxWidth : null", "scaled", true],
  ["global window width", "MediaQuery.sizeOf(context).width", "scaled", false],
  ["fixed width", "360", "scaled", false],
  ["substituted child", "constraints.hasBoundedWidth ? constraints.maxWidth : null", "rogueBar", false],
]) {
  test(`constrained scaffold header measurement: ${label}`, () => {
    const root = fixtureRoot({
      source: "Scaffold(appBar: CatchTopBar.route(title: 'Details'));",
      contract: compactContract(),
      includeRootContracts: false,
      canonicalScaffoldSource: `
        class CatchScaffold extends StatelessWidget {
          final PreferredSizeWidget? title;
          Widget build(BuildContext context) {
            return LayoutBuilder(
              builder: (context, constraints) => Scaffold(
                appBar: switch (title) {
                  final CatchScaledPreferredSize scaled => PreferredSize(
                    preferredSize: scaled.preferredSizeFor(context, width: ${width},),
                    child: ${child},
                  ),
                  final bar => bar,
                },
              ),
            );
          }
        }
      `,
    });
    const result = checkScreenTopBarContracts({root});
    assert.equal(hasFinding(result, "canonical-screen-scaffold-app-bar-drift"), !valid);
  });
}

test("navigation policy reads the top bar's direct configuration", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.route(
      title: 'People',
      actions: [SomeAction(navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back))],
    ));`,
    contract: compactContract({leading: "back"}),
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "missing-required-back-navigation"));
});

test("retired back flag cannot satisfy typed navigation policy", () => {
  const root = fixtureRoot({
    source: "Scaffold(appBar: CatchTopBar.route(title: 'People', showBackButton: true));",
    contract: compactContract({leading: "back"}),
  });
  assert.ok(hasFinding(checkScreenTopBarContracts({root}), "missing-required-back-navigation"));
});

test("nested action content cannot masquerade as a title override", () => {
  const root = fixtureRoot({
    source: `Scaffold(appBar: CatchTopBar.route(
      title: 'People', actions: [SomeAction(body: Text('Details'), variant: ActionVariant.quiet)],
    ));`,
    contract: compactContract(),
  });
  assert.deepEqual(checkScreenTopBarContracts({root}).findings, []);
});

function hasFinding(result, code) {
  return result.findings.some((finding) => finding.code === code);
}

function screenContract({
  expression = "CatchTopBar.screen",
  owner = "CatchTopBar.screen",
} = {}) {
  return {
    path: "lib/calendar/calendar_screen.dart",
    role: "screen",
    expression,
    owner,
  };
}

function compactContract({
  expression = "CatchTopBar.route",
  leading,
  surface,
  titlePolicy,
} = {}) {
  return {
    path: "lib/calendar/calendar_screen.dart",
    role: "compact",
    expression,
    owner: "CatchTopBar",
    ...(leading == null ? {} : {leading}),
    ...(surface == null ? {} : {surface}),
    ...(titlePolicy == null ? {} : {titlePolicy}),
  };
}

function workspaceContract() {
  return {
    path: "lib/calendar/calendar_screen.dart",
    role: "workspace",
    expression: "CatchTopBar.route",
    owner: "CatchTopBar",
    surface: "CatchRouteScaffold",
    reason: "The route owns a responsive operational workspace header.",
  };
}

function rootSurface({owner = "CatchTopBar.primaryRail"} = {}) {
  return {
    path: "lib/root/root_header.dart",
    symbol: "RootHeader",
    owner,
  };
}

function heroException() {
  return {
    path: "lib/hero/hero_header.dart",
    expression: "SliverAppBar",
    occurrences: 1,
    reason: "Detail media hero owns collapsing photo chrome.",
  };
}

function fixtureRoot({
  source,
  contract,
  extraSource,
  rootSource = `
    class RootHeader {
      Widget build() => CatchTopBar.primaryRail(title: 'Home');
    }
  `,
  rootSurface: configuredRootSurface = rootSurface(),
  rootHeaders,
  rawSource,
  rawChromeExceptions = [],
  includeRootContracts = true,
  routePresentations = [],
  manualSource,
  manualHeaders = [],
  trackedRootSources = [],
  canonicalScaffoldSource = `
    class CatchScaffold extends StatelessWidget {
      final PreferredSizeWidget? title;
      final Widget body;

      Widget build(BuildContext context) {
        return Scaffold(appBar: title, body: body);
      }
    }
  `,
  tokenSource = `
    static const EdgeInsets screenTitleBlock = EdgeInsets.fromLTRB(
      CatchSpacing.s5,
      CatchSpacing.s0,
      CatchSpacing.s5,
      CatchSpacing.s3,
    );
  `,
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-screen-chrome-"));
  write(root, contract.path, source);
  write(
    root,
    "packages/catch_ui/lib/src/patterns/catch_scaffold.dart",
    canonicalScaffoldSource,
  );
  if (includeRootContracts) {
    write(root, configuredRootSurface.path, rootSource);
    write(root, "packages/catch_tokens/lib/src/semantic/catch_insets.dart", tokenSource);
  }
  if (extraSource != null) {
    write(root, "lib/new/new_screen.dart", extraSource);
  }
  if (rawSource != null) {
    write(root, "lib/hero/hero_header.dart", rawSource);
  }
  if (manualSource != null) {
    write(root, "lib/manual/header.dart", manualSource);
  }
  for (const trackedRootSource of trackedRootSources) {
    write(root, trackedRootSource.path, trackedRootSource.source);
  }
  if (trackedRootSources.length > 0) {
    write(
      root,
      "tool/architecture/pattern_adoption.json",
      JSON.stringify({
        patterns: [
          {
            id: "ARCH-SCREEN-CHROME-001",
            adopters: trackedRootSources.map((trackedRootSource) => ({
              path: trackedRootSource.path,
              status: "aligned",
            })),
          },
        ],
      }),
    );
  }

  const configuredRootHeaders =
    rootHeaders ??
    [
      {
        branchKey: "_dashboardShellKey",
        routeName: "Routes.dashboardScreen.name",
        surfaces: [configuredRootSurface],
      },
    ];
  if (includeRootContracts) {
    write(
      root,
      "tool/design/root_screen_composition_contracts.json",
      JSON.stringify({
        schemaVersion: 1,
        branches: [
          {
            branchKey: "_dashboardShellKey",
            routeName: "Routes.dashboardScreen.name",
            owners: [],
          },
        ],
      }),
    );
  }
  const manifest = {
    schemaVersion: 2,
    logicalName: "fixture",
    contracts: [contract],
    rawChromeExceptions,
    routePresentations,
    manualHeaders,
  };
  if (includeRootContracts) {
    manifest.rootScreenManifestPath =
      "tool/design/root_screen_composition_contracts.json";
    manifest.screenGeometry = {
      tokenPath: "packages/catch_tokens/lib/src/semantic/catch_insets.dart",
      token: "screenTitleBlock",
      topInset: "CatchSpacing.s0",
    };
    manifest.rootHeaders = configuredRootHeaders;
  }
  write(
    root,
    "tool/design/screen_top_bar_contracts.json",
    JSON.stringify(manifest),
  );
  return root;
}

function write(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, contents);
}


test("screen geometry rejects app-local and escaped token sources", (t) => {
  for (const tokenPath of ["lib/core/theme/local.dart", "packages/catch_tokens/lib/../../local.dart"]) {
    const root = fixtureRoot({source: "Scaffold(appBar: CatchTopBar.screen(title: 'Review'));", contract: screenContract()});
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const file = path.join(root, "tool/design/screen_top_bar_contracts.json");
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    manifest.screenGeometry.tokenPath = tokenPath;
    fs.writeFileSync(file, JSON.stringify(manifest));
    assert.ok(checkScreenTopBarContracts({root}).findings.some((finding) => finding.code === "invalid-screen-geometry-path"));
  }
});
