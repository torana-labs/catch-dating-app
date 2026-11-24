// The snapshots expectRouterTopology compares sit beside the router tests
// (TESTS.md, "Filesystem reads").
// test-selection-reads: test/routing/
import 'dart:convert';
import 'dart:io';

import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// Set to rewrite the committed snapshots instead of comparing with them.
const routerTopologyUpdateVariable = 'UPDATE_ROUTER_TOPOLOGY';

/// One row per [GoRoute] under [routes], in the order go_router matches them:
/// its name, its full path, the full path of the route it is nested in, and
/// the shell branch that holds it. Shell routes add no row; they name the
/// branch of the rows below them, so moving a route between tabs shows.
List<Map<String, Object?>> flattenRouteTopology(List<RouteBase> routes) {
  final rows = <Map<String, Object?>>[];
  var shells = 0;
  void walk(
    List<RouteBase> children, {
    required String? parentPath,
    required String? shell,
  }) {
    for (final route in children) {
      switch (route) {
        case GoRoute():
          final path = _fullPath(parentPath, route.path);
          rows.add({
            'name': route.name,
            'path': path,
            'parent': parentPath,
            'shell': shell,
          });
          walk(route.routes, parentPath: path, shell: shell);
        case StatefulShellRoute():
          final id = _shellId(shell, 'stateful shell ${shells++}');
          for (final (index, branch) in route.branches.indexed) {
            walk(
              branch.routes,
              parentPath: parentPath,
              shell: '$id, branch $index',
            );
          }
        case ShellRoute():
          walk(
            route.routes,
            parentPath: parentPath,
            shell: _shellId(shell, 'shell ${shells++}'),
          );
        default:
          throw UnsupportedError(
            'The router topology has no row for ${route.runtimeType}.',
          );
      }
    }
  }

  walk(routes, parentPath: null, shell: null);
  return rows;
}

String _shellId(String? outer, String id) =>
    outer == null ? id : '$outer > $id';

String _fullPath(String? parent, String path) {
  if (parent == null || path.startsWith('/')) return path;
  return parent.endsWith('/') ? '$parent$path' : '$parent/$path';
}

/// One row per line, so a route change is a one-line diff.
String encodeRouteTopology(List<Map<String, Object?>> rows) =>
    '{\n  "routes": [\n'
    '${rows.map((row) => '    ${jsonEncode(row)}').join(',\n')}\n'
    '  ]\n}\n';

/// Fails when [router]'s routes differ from the snapshot at [snapshotPath], a
/// repository-relative path. With [routerTopologyUpdateVariable] set, it
/// rewrites the snapshot instead.
void expectRouterTopology(GoRouter router, String snapshotPath) {
  final actual = encodeRouteTopology(
    flattenRouteTopology(router.configuration.routes),
  );
  final snapshot = repoFile(snapshotPath);
  if (Platform.environment[routerTopologyUpdateVariable] != null) {
    snapshot.writeAsStringSync(actual);
    return;
  }
  expect(
    snapshot.existsSync() ? snapshot.readAsStringSync() : null,
    actual,
    reason:
        'The routes in $snapshotPath changed. A route change is a behaviour '
        'change: if it is intended, rerun with $routerTopologyUpdateVariable=1 '
        'and commit the snapshot.',
  );
}
