import 'dart:io';

import 'package:test/test.dart';

import '../../tool/architecture/check_ui_composition_contracts.dart';

void main() {
  test(
    'canonical local GoRoute helpers remain analyzable without duplicate sites',
    () async {
      for (final router in canonicalRouterFiles) {
        final summaries = await resolveRouteConstructionSummariesForFile(
          root: Directory.current.absolute.path,
          relativePath: router,
        );
        final goRoutes = summaries
            .where((summary) => summary.startsWith('go-route:'))
            .toList();

        expect(goRoutes, isNotEmpty, reason: router);
        expect(
          goRoutes,
          everyElement(
            allOf(startsWith('go-route:constructor:'), endsWith(':true')),
          ),
          reason: router,
        );
      }
    },
  );

  test(
    'resolved route scan cannot be bypassed by aliases or indirection',
    () async {
      final summaries = await resolveRouteConstructionSummariesForFile(
        root: Directory.current.absolute.path,
        relativePath:
            'test/tool/fixtures/route_discovery_adversarial_fixture.dart',
      );

      expect(
        summaries,
        contains(
          allOf(
            startsWith('go-route:constructor:GoRouteAlias:aliasRoute:builder:'),
            endsWith('false'),
          ),
        ),
      );
      expect(
        summaries,
        contains(contains('go-route:constructorTearOff:GoRoute')),
      );
      expect(
        summaries,
        contains(contains('go-route:factoryInvocation:GoRoute')),
      );
    },
  );

  test('resolved route scan covers every full-screen PageRoute form', () async {
    final summaries = await resolveRouteConstructionSummariesForFile(
      root: Directory.current.absolute.path,
      relativePath:
          'test/tool/fixtures/route_discovery_adversarial_fixture.dart',
    );

    for (final routeType in <String>[
      'MaterialPageRouteAlias<void>',
      'CupertinoPageRoute<void>',
      'PageRouteBuilder<void>',
      'CustomPageRoute<void>',
    ]) {
      expect(summaries, contains('page-route:constructor:$routeType:false'));
    }
    expect(
      summaries,
      contains(
        contains('page-route:constructorTearOff:MaterialPageRoute<void>'),
      ),
    );
    expect(
      summaries,
      contains('page-route:factoryInvocation:PageRoute<void>:false'),
    );
  });
}
