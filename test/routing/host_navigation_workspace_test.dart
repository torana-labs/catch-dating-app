import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final (destination, view) in [
    (Routes.hostFormResponseDetailScreen, HostAudienceView.responses),
    (Routes.hostApplicationDetailScreen, HostAudienceView.responses),
    (Routes.hostFormTemplatesScreen, HostAudienceView.forms),
    (Routes.hostCreateSavedAudienceScreen, HostAudienceView.audiences),
    (Routes.hostAddCustomerScreen, HostAudienceView.people),
  ]) {
    for (final width in [390.0, 1400.0]) {
      testWidgets(
        '${destination.name} preserves ${view.name} through the real shell at $width',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = Size(width, 900);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final productionShell =
              hostWorkspaceRouteGraph(
                    AppAnalytics(),
                  ).branches[HostWorkspaceRoot.audience.index].routes.single
                  as ShellRoute;
          final route = productionShell.routes
              .whereType<HostWorkspaceDestination>()
              .singleWhere((route) => route.name == destination.name);
          final router = GoRouter(
            initialLocation:
                '/host/audience?view=${view.name}&organizerId=organizer',
            routes: [
              ShellRoute(
                builder: productionShell.builder,
                routes: [
                  productionShell.routes.first,
                  // Keep the production shell and route identity; isolate data loading.
                  HostWorkspaceDestination(
                    root: route.root,
                    audienceView: route.audienceView,
                    path: route.path,
                    name: route.name,
                    builder: (_, _) =>
                        const Material(child: Text('Response detail')),
                  ),
                ],
              ),
            ],
          );
          addTearDown(router.dispose);
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => Stream.value(null)),
              ],
              child: MaterialApp.router(
                theme: AppTheme.light,
                routerConfig: router,
              ),
            ),
          );
          await pumpFeatureUi(tester);
          final parameters = {
            for (final match in RegExp(r':(\w+)').allMatches(route.path))
              match.group(1)!: 'record',
          };
          final detailResult = router.pushNamed<void>(
            destination.name,
            pathParameters: parameters,
            queryParameters: const {
              'organizerId': 'organizer',
              '_responseFormId': 'form',
            },
          );
          await pumpFeatureUi(tester);
          final index = tester.widget<HostWorkspaceIndexScreen>(
            find.byType(HostWorkspaceIndexScreen),
          );
          expect(index.uri.queryParameters['view'], view.name);
          expect(index.uri.queryParameters['_responseFormId'], 'form');
          expect(find.text('Response detail'), findsOneWidget);
          router.pop();
          await detailResult;
          await pumpFeatureUi(tester);
          expect(
            router.routeInformationProvider.value.uri.queryParameters['view'],
            view.name,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('navigator anchor does not mount a second production index', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: HostWorkspaceRouteScope(
          navigatorRoot: true,
          panes: const [],
          onBack: () {},
          child: HostWorkspaceIndexScreen(
            root: Routes.hostEventsScreen,
            uri: Uri(path: Routes.hostEventsScreen.path),
          ),
        ),
      ),
    );
    // Mounting a second index would also attempt to resolve its providers.
    expect(find.byType(CatchNavigationViewport), findsNothing);
    expect(tester.takeException(), isNull);
  });

  test(
    'every Host named route belongs to one of the five workspace branches',
    () {
      final graph = hostWorkspaceRouteGraph(AppAnalytics());
      expect(graph.branches, hasLength(5));
      final names = <String>[];
      void visit(RouteBase route) {
        if (route is GoRoute) {
          expect(route.parentNavigatorKey, isNull, reason: route.name);
          if (route.name != null) names.add(route.name!);
          if (!HostWorkspaceRoot.values.any(
            (root) => root.route.name == route.name,
          )) {
            expect(
              route,
              isA<HostWorkspaceDestination>(),
              reason:
                  'Every non-root Host destination requires workspace ancestry metadata: ${route.name ?? route.path}',
            );
          }
        }
        for (final child in route.routes) {
          visit(child);
        }
      }

      for (final branch in graph.branches) {
        expect(branch.routes.single, isA<ShellRoute>());
        visit(branch.routes.single);
      }
      expect(names.toSet(), {
        for (final route in Routes.values)
          if (route.audience == AppRouteAudience.host ||
              const {
                Routes.eventChatScreen,
                Routes.eventLocationMapScreen,
                Routes.eventProfileSharingScreen,
                Routes.eventChatParticipantsScreen,
                Routes.eventParticipantProfileScreen,
              }.contains(route))
            route.name,
      });
      expect(names.length, names.toSet().length);
    },
  );

  for (final view in HostAudienceView.values) {
    testWidgets(
      'Audience ${view.name} keeps its detail slot before data loads',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(1400, 900);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
            child: MaterialApp(
              theme: AppTheme.light,
              home: HostWorkspaceIndexScreen(
                root: Routes.hostAudienceScreen,
                uri: Uri(
                  path: Routes.hostAudienceScreen.path,
                  queryParameters: {'view': view.name},
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        final viewport = tester.widget<CatchNavigationViewport>(
          find.byType(CatchNavigationViewport),
        );
        expect(viewport.panes, hasLength(2), reason: view.name);
        expect(viewport.panes.last.id, 'placeholder');
        expect(tester.takeException(), isNull);
      },
    );
  }

  test(
    'all declared Host parents form complete acyclic paths in their own workspace',
    () {
      final graph = hostWorkspaceRouteGraph(AppAnalytics());
      final destinations = [
        for (final branch in graph.branches)
          ...branch.routes.single.routes.whereType<HostWorkspaceDestination>(),
      ];
      final router = GoRouter(
        routes: [GoRoute(path: '/', builder: (_, _) => const SizedBox())],
      );
      addTearDown(router.dispose);
      for (final route in destinations) {
        final state = GoRouterState(
          router.configuration,
          uri: Uri(path: route.path),
          matchedLocation: route.path,
          name: route.name,
          path: route.path,
          fullPath: route.path,
          pathParameters: const {},
          pageKey: ValueKey(route.name ?? route.path),
        );
        final ancestry = hostWorkspaceAncestors(destinations, route, state);
        expect(
          ancestry.every((parent) => parent.root == route.root),
          isTrue,
          reason: route.name,
        );
        if (route.parent != null) {
          expect(ancestry.last.name, route.parent!.name, reason: route.name);
        }
      }
      HostWorkspaceDestination destination(Routes route) =>
          destinations.singleWhere((d) => d.name == route.name);
      final rooms = destination(Routes.hostWorkHotelRoomsScreen);
      final state = GoRouterState(
        router.configuration,
        uri: Uri(path: rooms.path),
        matchedLocation: rooms.path,
        name: rooms.name,
        path: rooms.path,
        fullPath: rooms.path,
        pathParameters: const {},
        pageKey: const ValueKey('rooms'),
      );
      expect(
        hostWorkspaceAncestors(destinations, rooms, state).map((r) => r.name),
        [
          Routes.hostWorkScreen.name,
          Routes.hostWorkProgramScreen.name,
          Routes.hostWorkHotelScreen.name,
        ],
      );
    },
  );

  testWidgets(
    'routed editor previews join the outer strip and never become compact destinations',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1400, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final draft = TextEditingController();
      addTearDown(draft.dispose);
      final router = GoRouter(
        initialLocation: '/editor',
        routes: [
          ShellRoute(
            builder: (context, state, child) => HostWorkspaceRouteFrame(
              index: HostNavigationWorkspace(
                spec: HostDirectoryWorkspace<String>(
                  index: const Material(child: Text('Directory')),
                  selection: null,
                  detailBuilder: (_) => const SizedBox.shrink(),
                  unselected: const Text('Select'),
                ),
              ),
              navigator: child,
              ancestors: const [],
              selectedRoute: 'editor',
              selectedContentId: 'editor',
              onBack: () {},
            ),
            routes: [
              GoRoute(
                path: '/editor',
                builder: (_, _) => HostWorkspaceRouteContent(
                  id: 'editor',
                  builder: (_) => HostNavigationWorkspace(
                    spec: HostEditorWorkspace(
                      editor: Material(
                        child: TextField(
                          key: const ValueKey('editor-input'),
                          controller: draft,
                        ),
                      ),
                      preview: AnimatedBuilder(
                        animation: draft,
                        builder: (_, _) => Text('Preview: ${draft.text}'),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      );
      await pumpFeatureUi(tester);
      final physicalViewport = find.byWidgetPredicate(
        (widget) =>
            widget is CatchNavigationViewport && widget.panes.length > 1,
      );
      expect(physicalViewport, findsOneWidget);
      final viewport = tester.widget<CatchNavigationViewport>(physicalViewport);
      expect(viewport.panes.map((pane) => pane.id), [
        'index',
        'editor',
        'editor.preview',
      ]);
      await tester.enterText(
        find.byKey(const ValueKey('editor-input')),
        'Retained',
      );
      await pumpFeatureUi(tester);
      expect(find.text('Preview: Retained'), findsOneWidget);
      tester.view.physicalSize = const Size(390, 844);
      await pumpFeatureUi(tester);
      expect(find.byKey(const ValueKey('editor-input')), findsOneWidget);
      expect(find.text('Preview: Retained'), findsNothing);
      expect(draft.text, 'Retained');
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'legacy Audience submission links resolve to typed routes with the person parent',
    () {
      expect(
        hostAudienceRecordRedirect(
          Uri.parse('/host/audience?organizerId=o&contactId=c&responseId=r'),
        ),
        '/host/audience/responses/r?organizerId=o&_parentContactId=c',
      );
      expect(
        hostAudienceRecordRedirect(
          Uri.parse('/host/audience?organizerId=o&contactId=c&applicationId=a'),
        ),
        '/host/audience/applications/a?organizerId=o&_parentContactId=c',
      );
    },
  );

  testWidgets(
    'routed panes keep index state, nested Back and push results across widths',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1400, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final draft = TextEditingController();
      addTearDown(draft.dispose);
      final router = GoRouter(
        initialLocation: '/index',
        routes: [
          ShellRoute(
            builder: (context, state, child) => HostWorkspaceRouteFrame(
              index: HostNavigationWorkspace(
                spec: HostTaskWorkspace(
                  content: Material(
                    child: TextField(
                      key: const ValueKey('index-draft'),
                      controller: draft,
                    ),
                  ),
                ),
              ),
              navigator: child,
              selectedRoute: state.uri.path == '/index' ? null : state.uri.path,
              ancestors: [
                if (state.uri.path == '/record')
                  const CatchWorkspacePane(
                    id: 'detail',
                    child: HostWorkspaceRouteContent(
                      id: '/detail',
                      builder: _detailDraft,
                    ),
                  ),
              ],
              onBack: () => context.canPop()
                  ? context.pop('saved')
                  : context.go('/index'),
            ),
            routes: [
              GoRoute(
                path: '/index',
                builder: (context, _) =>
                    HostWorkspaceRouteScope.isNavigatorRoot(context)
                    ? const SizedBox.shrink()
                    : const Material(child: Text('Duplicate root index')),
              ),
              GoRoute(
                path: '/detail',
                builder: (_, _) => const HostWorkspaceRouteContent(
                  id: '/detail',
                  builder: _detailDraft,
                ),
              ),
              GoRoute(
                path: '/record',
                builder: (context, _) => HostWorkspaceRouteContent(
                  id: '/record',
                  builder: (context) => const Material(
                    child: Column(
                      children: [
                        Text('Record'),
                        CatchTopBar.route(
                          title: 'Record',
                          navigation: CatchTopBarNavigation(
                            mode: CatchTopBarNavigationMode.back,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      );
      await pumpFeatureUi(tester);
      expect(
        find.text('Duplicate root index', skipOffstage: false),
        findsNothing,
      );
      await tester.enterText(
        find.byKey(const ValueKey('index-draft')),
        'Keep this draft',
      );
      final indexElement = tester.element(
        find.byKey(const ValueKey('index-draft')),
      );
      final detailResult = router.push<String>('/detail');
      await pumpFeatureUi(tester);
      expect(find.text('Detail'), findsOneWidget);
      expect(
        find.text('Duplicate root index', skipOffstage: false),
        findsNothing,
      );
      expect(
        tester.element(find.byKey(const ValueKey('index-draft'))),
        same(indexElement),
      );
      await tester.enterText(
        find.byKey(const ValueKey('detail-draft')),
        'A retained route draft',
      );
      final detailElement = tester.element(
        find.byKey(const ValueKey('detail-draft')),
      );
      final result = router.push<String>('/record');
      await pumpFeatureUi(tester);
      expect(
        tester.element(find.byKey(const ValueKey('detail-draft'))),
        same(detailElement),
      );
      expect(find.text('A retained route draft'), findsOneWidget);
      expect(find.text('Record'), findsNWidgets(2));
      tester.view.physicalSize = const Size(390, 844);
      await pumpFeatureUi(tester);
      expect(find.byKey(const ValueKey('index-draft')), findsNothing);
      expect(find.byKey(const ValueKey('detail-draft')), findsNothing);
      await tester.tap(find.byTooltip('Back'));
      await pumpFeatureUi(tester);
      expect(await result, 'saved');
      expect(find.text('Detail'), findsOneWidget);
      expect(
        tester.element(find.byKey(const ValueKey('detail-draft'))),
        same(detailElement),
      );
      expect(find.text('A retained route draft'), findsOneWidget);
      router.pop('closed');
      await pumpFeatureUi(tester);
      expect(await detailResult, 'closed');
      expect(find.text('Keep this draft'), findsOneWidget);
      expect(
        tester.element(find.byKey(const ValueKey('index-draft'))),
        same(indexElement),
      );
      expect(tester.takeException(), isNull);
    },
  );
}

Widget _detailDraft(BuildContext context) => const _RouteDraft();

class _RouteDraft extends StatefulWidget {
  const _RouteDraft();
  @override
  State<_RouteDraft> createState() => _RouteDraftState();
}

class _RouteDraftState extends State<_RouteDraft> {
  final _draft = TextEditingController();
  @override
  void dispose() {
    _draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Material(
    child: Column(
      children: [
        const Text('Detail'),
        TextField(key: const ValueKey('detail-draft'), controller: _draft),
      ],
    ),
  );
}
