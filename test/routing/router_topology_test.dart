import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/analytics_test_helpers.dart';
import '../support/router_topology.dart';

// The behaviour gate for the Phase 4 router split (issue #2373): both routers'
// routes, flattened, against committed snapshots. Splitting or moving the
// router files must leave both snapshots byte for byte as they are.
void main() {
  for (final (app, provider) in [
    ('host', hostGoRouterProvider),
    ('consumer', consumerGoRouterProvider),
  ]) {
    testWidgets('the $app router keeps its route topology', (tester) async {
      final container = ProviderContainer(
        overrides: [
          firebaseAuthProvider.overrideWithValue(MockFirebaseAuth()),
          appAnalyticsProvider.overrideWithValue(
            AppAnalytics(
              reporter: RecordingAnalyticsReporter(),
              shouldCollect: false,
            ),
          ),
          uidProvider.overrideWithValue(const AsyncData(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        ],
      );
      addTearDown(container.dispose);

      expectRouterTopology(
        container.read(provider),
        'test/routing/router_topology_$app.json',
      );
    });
  }

  test('the topology names each route, its full path, its parent and the '
      'shell branch that holds it', () {
    Widget page(BuildContext context, GoRouterState state) =>
        const SizedBox.shrink();
    final routes = <RouteBase>[
      GoRoute(
        path: '/',
        name: 'home',
        builder: page,
        routes: [GoRoute(path: 'detail/:id', name: 'detail', builder: page)],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => shell,
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/today', name: 'today', builder: page)],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/people',
                redirect: (context, state) => '/today',
                routes: [GoRoute(path: 'inbox', name: 'inbox', builder: page)],
              ),
            ],
          ),
        ],
      ),
    ];
    expect(flattenRouteTopology(routes), [
      {'name': 'home', 'path': '/', 'parent': null, 'shell': null},
      {'name': 'detail', 'path': '/detail/:id', 'parent': '/', 'shell': null},
      {
        'name': 'today',
        'path': '/today',
        'parent': null,
        'shell': 'stateful shell 0, branch 0',
      },
      {
        'name': null,
        'path': '/people',
        'parent': null,
        'shell': 'stateful shell 0, branch 1',
      },
      {
        'name': 'inbox',
        'path': '/people/inbox',
        'parent': '/people',
        'shell': 'stateful shell 0, branch 1',
      },
    ]);
    expect(
      encodeRouteTopology(flattenRouteTopology(routes.reversed.toList())),
      isNot(encodeRouteTopology(flattenRouteTopology(routes))),
      reason: 'go_router matches in order, so order is topology',
    );
  });
}
