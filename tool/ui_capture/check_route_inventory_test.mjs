import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInventory,
  extractRouterSemanticClosure,
  extractGoRouterConfigurationBlock,
  extractImperativePageRoutesFromSource,
  extractRuntimeRouteEntries,
  extractRuntimeRouteGraph,
  imperativePagePresentationTarget,
  isUnnamedRedirectOnly,
  normalizePresentationExpression,
  routePresentationExpression,
  routePresentationTarget,
  routeRenderKind,
  validateRouteSourceForInventory,
} from "./check_route_inventory.mjs";

test("extracts returned and lifecycle-owned GoRouter configurations", () => {
  for (const source of [
    "return GoRouter(routes: const []);",
    "final router = GoRouter(routes: const []); ref.onDispose(router.dispose); return router;",
  ]) {
    const block = extractGoRouterConfigurationBlock(source);
    assert.match(block.body, /routes:\s*const \[\]/u);
  }
});

test("allows only an unnamed redirect-only legacy route", () => {
  assert.equal(isUnnamedRedirectOnly({
    redirectExpression: "(_, state) => legacyRedirect(state.uri)",
    builderExpression: "",
    pageBuilderExpression: "",
  }), true);
});

test("rejects unnamed routes that can render a page", () => {
  assert.equal(isUnnamedRedirectOnly({
    redirectExpression: "(_, state) => legacyRedirect(state.uri)",
    builderExpression: "(_, _) => const LegacyScreen()",
    pageBuilderExpression: "",
  }), false);
  assert.equal(isUnnamedRedirectOnly({
    redirectExpression: "",
    builderExpression: "",
    pageBuilderExpression: "",
  }), false);
});

test("classifies rendered and redirect-only route presentations", () => {
  assert.equal(routeRenderKind({
    redirectExpression: "(_, _) => '/new'",
    builderExpression: "",
    pageBuilderExpression: "",
  }), "redirect");
  assert.equal(routeRenderKind({
    redirectExpression: "",
    builderExpression: "(_, _) => const Screen()",
    pageBuilderExpression: "",
  }), "builder");
  assert.equal(routeRenderKind({
    redirectExpression: "",
    builderExpression: "",
    pageBuilderExpression: "(_, _) => const MaterialPage(child: Screen())",
  }), "pageBuilder");
});

test("normalizes the active route presentation expression", () => {
  assert.equal(routePresentationExpression({
    renderKind: "builder",
    redirectExpression: "(_, _) => '/new'",
    builderExpression: "(context, state) =>\n const Screen()",
    pageBuilderExpression: "",
  }), "(context,state)=>const Screen()");
  assert.equal(routePresentationExpression({
    renderKind: "pageBuilder",
    redirectExpression: "",
    builderExpression: "",
    pageBuilderExpression: "_eventDetailPage",
  }), "_eventDetailPage");
});

test("canonical presentation expressions ignore formatting but preserve strings", () => {
  assert.equal(
    normalizePresentationExpression(
      "(_, _) => Screen( label: 'hello world', values: const { 1, 2, }, )",
    ),
    "(_,_)=>Screen(label:'hello world',values:const{1,2})",
  );
  assert.equal(
    normalizePresentationExpression("final Event event => event"),
    "final Event event=>event",
  );
});

test("extracts deterministic presentation targets from route presentations", () => {
  assert.equal(
    routePresentationTarget("(context, state) => const Screen()"),
    "Screen",
  );
  assert.equal(routePresentationTarget("_eventDetailPage"), "_eventDetailPage");
  assert.equal(
    routePresentationTarget(
      "(context, state) { final id = state.pathParameters['id']; return DetailScreen(id: id); }",
    ),
    "DetailScreen",
  );
});

test("inventories generic imperative MaterialPageRoute presentations", () => {
  const routes = extractImperativePageRoutesFromSource(`
Future<void> open(BuildContext context) {
  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => const FeatureScreen(),
    ),
  );
}
`, "lib/feature/open.dart");

  assert.match(routes[0].siteId, /^material-page:lib\/feature\/open.dart:[a-f0-9]{64}:1$/u);
  assert.deepEqual(routes.map(({siteId, routeExpression, ...route}) => route), [{
    sourcePath: "lib/feature/open.dart",
    line: 4,
    ordinal: 1,
    presentationExpression: "(_)=>const FeatureScreen()",
    presentationTarget: "FeatureScreen",
    fullscreenDialogExpression: "true",
  }]);
});

test("finds a screen nested inside an imperative Consumer builder", () => {
  assert.equal(
    imperativePagePresentationTarget(
      "(context) => Consumer(builder: (_, ref, _) => MatchCelebrationDialog(match: match))",
    ),
    "MatchCelebrationDialog",
  );
});

test("does not inventory modal sheets or dialogs as imperative pages", () => {
  const routes = extractImperativePageRoutesFromSource(`
showDialog<void>(context: context, builder: (_) => const AlertDialog());
showModalBottomSheet<void>(
  context: context,
  builder: (_) => const SheetBody(),
);
`, "lib/feature/modals.dart");

  assert.deepEqual(routes, []);
});

test("discovers arrow-bodied route helpers instead of dropping their routes", () => {
  const source = `
GoRouter buildRouter() {
  return GoRouter(
  routes: [
    ...fixtureRoutes(),
  ],
);
}

List<GoRoute> fixtureRoutes() => [
  GoRoute(
    path: Routes.fixture.path,
    name: Routes.fixture.name,
    builder: (_, _) => const FixtureScreen(),
  ),
];
`;
  const graph = extractRuntimeRouteGraph(
    source,
    extractGoRouterConfigurationBlock(source),
  );
  const routes = extractRuntimeRouteEntries(graph.text, [
    {id: "fixture", path: "/fixture"},
  ]);

  assert.deepEqual(graph.routeHelperNames, ["fixtureRoutes"]);
  assert.deepEqual(routes.map((route) => route.id), ["fixture"]);
});

test("fails closed on imported or prebuilt route collections", () => {
  const variableSource = `return GoRouter(routes: [...importedRoutes]);`;
  assert.throws(
    () => extractRuntimeRouteGraph(
      variableSource,
      extractGoRouterConfigurationBlock(variableSource),
    ),
    /imported or prebuilt spread collection `importedRoutes`/u,
  );

  const helperSource = `return GoRouter(routes: [...importedRoutes()]);`;
  assert.throws(
    () => extractRuntimeRouteGraph(
      helperSource,
      extractGoRouterConfigurationBlock(helperSource),
    ),
    /no locally declared typed route factory could be resolved/u,
  );

  const prebuiltHelperSource = `
return GoRouter(routes: [...localRoutes()]);
List<GoRoute> localRoutes() => importedRoutes;
`;
  assert.throws(
    () => extractRuntimeRouteGraph(
      prebuiltHelperSource,
      extractGoRouterConfigurationBlock(prebuiltHelperSource),
    ),
    /does not construct a supported route or delegate/u,
  );
});

test("fails closed on route constructor typedefs", () => {
  assert.throws(
    () => validateRouteSourceForInventory(
      "typedef AppRoute = GoRoute;\nAppRoute(path: '/hidden');",
      "lib/routing/go_router.dart",
    ),
    /route constructor typedefs are not inventory-safe \(GoRoute\)/u,
  );
  assert.throws(
    () => validateRouteSourceForInventory(
      "typedef AppPage<T> = MaterialPageRoute<T>;",
      "lib/feature/open.dart",
    ),
    /route constructor typedefs are not inventory-safe \(MaterialPageRoute\)/u,
  );
});

test("fails closed on GoRoute definitions outside the canonical graph", () => {
  assert.throws(
    () => validateRouteSourceForInventory(
      "final route = router.GoRoute(path: '/hidden');",
      "lib/feature/imported_routes.dart",
    ),
    /GoRoute construction is outside lib\/routing\/go_router\.dart/u,
  );
});

test("fails closed on GoRoute definitions in an app package", () => {
  assert.throws(
    () => validateRouteSourceForInventory(
      "final route = GoRoute(path: '/today');",
      "apps/host/lib/today/today_screen.dart",
    ),
    /GoRoute construction is outside lib\/routing\/go_router\.dart/u,
  );
});

test("fails closed on unsupported full-screen PageRoute constructors", () => {
  for (const routeType of ["CupertinoPageRoute", "PageRouteBuilder"]) {
    assert.throws(
      () => extractImperativePageRoutesFromSource(
        `${routeType}<void>(builder: (_) => const FixtureScreen())`,
        "lib/feature/open.dart",
      ),
      new RegExp(`${routeType} is a full-screen PageRoute`, "u"),
    );
  }
});

const contract = "enum Routes {\n fixture('/fixture'),\n ;\n }";
const router = `GoRouter buildRouter() {
  return GoRouter(routes: [GoRoute(path: Routes.fixture.path,
    name: Routes.fixture.name, builder: (_, _) => fixtureScreen())]);
}
Widget fixtureScreen() => const FixtureScreen();
void unrelated() { print('diagnostic'); }
`;
const inventory = (routerSource = router, imperativePageRoutes = []) => buildInventory({
  routeContractSource: contract, routerSource, imperativePageRoutes,
});

test("unrelated router code and imperative line movement do not stale semantic inventory", () => {
  assert.deepEqual(inventory(router.replace("print('diagnostic')", "print('changed diagnostic')")), inventory());
  const source = "void open() { MaterialPageRoute(builder: (_) => const FixtureScreen()); }";
  assert.deepEqual(
    inventory(router, extractImperativePageRoutesFromSource(source, "lib/open.dart")),
    inventory(router, extractImperativePageRoutesFromSource("\n".repeat(55) + source, "lib/open.dart")),
  );
  assert.equal("normalizedFileSha256" in inventory().source, false);
});

test("route deletion, retargeting, helper presentation and shell composition still invalidate inventory", () => {
  assert.throws(() => inventory("return GoRouter(routes: []);"), /declared but not wired/);
  assert.notDeepEqual(inventory(router.replace("FixtureScreen()", "OtherScreen()")), inventory());
  assert.notDeepEqual(inventory(router.replace("fixtureScreen())]);", "fixtureScreen(), parentNavigatorKey: rootKey)]);")), inventory());
  assert.throws(() => inventory(router.replace("Routes.fixture.path", "'/wrong'")), /composed runtime path/);
  assert.match(extractRouterSemanticClosure(router), /Widget|fixtureScreen/);
});

test("imperative identities survive independent insertion and retain target, composition and multiplicity", () => {
  const first = "MaterialPageRoute(builder: (_) => const FixtureScreen())";
  const second = "MaterialPageRoute(builder: (_) => const OtherScreen())";
  const read = source => inventory(router, extractImperativePageRoutesFromSource(source, "lib/open.dart")).imperativePageRoutes;
  const original = read(first)[0];
  assert.ok(read(`${second}; ${first}`).some(route => route.siteId === original.siteId));
  assert.equal(read(`${first}; ${first}`).length, 2);
  assert.notEqual(read(`${first}; ${first}`)[0].siteId, read(`${first}; ${first}`)[1].siteId);
  assert.notDeepEqual(read(first), read(second));
  assert.notDeepEqual(read(first), read(first.replace("builder:", "fullscreenDialog: true, builder:")));
  assert.equal("line" in original, false); assert.equal(original.ordinal, 1);
});

test("semantic closure preserves named-parameter bodies and arrow defaults", () => {
  const body = router.replace("Widget fixtureScreen() => const FixtureScreen();",
    "Widget fixtureScreen({bool enabled = true}) { return const FixtureScreen(); }");
  assert.notDeepEqual(inventory(body), inventory(body.replace("FixtureScreen();", "OtherScreen();")));
  const arrow = router.replace("Widget fixtureScreen() =>", "Widget fixtureScreen({bool enabled = true}) =>");
  assert.notDeepEqual(inventory(arrow), inventory(arrow.replace("enabled = true", "enabled = false")));
});

test("switch expressions do not bind unrelated functions as callable helpers", () => {
  const source = "Widget other() {\n  return switch (mode) { _ => const OtherScreen() };\n}\n" +
    router.replace("Widget fixtureScreen() => const FixtureScreen();",
      "Widget fixtureScreen() {\n  return switch (mode) { _ => const FixtureScreen() };\n}");
  assert.deepEqual(inventory(source), inventory(source.replace("OtherScreen()", "AnotherScreen()")));
  assert.notDeepEqual(inventory(source), inventory(source.replace("FixtureScreen()", "OtherScreen()")));
});

test("a return invocation before the declaration cannot hide a reachable helper body", () => {
  const source = router.replace("Widget fixtureScreen() => const FixtureScreen();",
    "Widget fixtureScreen() {\n  return nestedScreen();\n}\nWidget nestedScreen() => const FixtureScreen();");
  assert.notDeepEqual(inventory(source), inventory(source.replace("FixtureScreen()", "OtherScreen()")));
});

test("typed Host destinations retain canonical wiring and ancestor metadata in inventory", () => {
  const typed = router.replace("GoRoute(path:", "HostWorkspaceDestination(root: HostWorkspaceRoot.audience, parent: Routes.parent, path:");
  assert.equal(inventory(typed).routes[0].id, "fixture");
  assert.notDeepEqual(inventory(typed), inventory(typed.replace("HostWorkspaceRoot.audience", "HostWorkspaceRoot.events")));
  assert.notDeepEqual(inventory(typed), inventory(typed.replace("Routes.parent", "Routes.other")));
  assert.throws(() => inventory(typed.replace("Routes.fixture.path", "'/wrong'")), /composed runtime path/);
  assert.throws(() => inventory(typed.replace("HostWorkspaceDestination(root:", "OtherDestination(root:")), /declared but not wired/);
});
