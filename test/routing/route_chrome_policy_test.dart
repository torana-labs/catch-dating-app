import 'dart:io';

import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('consumer detail routes render above the floating tab shell', () {
    final source = File('lib/routing/go_router.dart').readAsStringSync();

    for (final route in <Routes>[
      Routes.notificationsScreen,
      Routes.eventRecapScreen,
      Routes.organizerDetailScreen,
      Routes.eventDetailScreen,
      Routes.chatScreen,
    ]) {
      expect(
        _routeBlock(source, route),
        anyOf(
          contains('parentNavigatorKey: keys.root'),
          contains('parentNavigatorKey: rootNavigatorKey'),
        ),
        reason: '${route.name} must sit above the floating tab shell.',
      );
    }
  });
}

String _routeBlock(String source, Routes route) {
  final routeName = 'name: Routes.${route.name}.name,';
  final nameOffset = source.indexOf(routeName);
  expect(nameOffset, isNot(-1), reason: 'Missing route ${route.name}.');

  final routeStart = source.lastIndexOf('GoRoute(', nameOffset);
  expect(routeStart, isNot(-1), reason: 'Missing GoRoute for ${route.name}.');

  final nextRouteStart = source.indexOf('GoRoute(', nameOffset + 1);
  return source.substring(
    routeStart,
    nextRouteStart == -1 ? source.length : nextRouteStart,
  );
}
