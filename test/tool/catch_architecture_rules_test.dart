import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:catch_ui_lints/src/architecture_context_map.dart';
import 'package:catch_ui_lints/src/architecture_findings.dart';
import 'package:flutter_test/flutter_test.dart';

List<ArchitectureFinding> _direction(String path, String source) {
  final unit = parseString(content: source, throwIfDiagnostics: false).unit;
  return dependencyDirectionFindings(
    relativePath: path,
    source: source,
    unit: unit,
  );
}

List<String> _rules(String path, String source) => [
  for (final finding in _direction(path, source)) finding.code,
];

final _map = ContextMap.parse(
  jsonEncode({
    'roots': {
      'contexts': 'lib/contexts/',
      'pages': 'lib/pages/',
      'kernel': 'lib/kernel/',
      'platform': 'lib/platform/',
    },
    'contexts': [
      {'id': 'events', 'owns': 'Events.'},
      {'id': 'bookings', 'owns': 'Bookings.'},
    ],
    'legacy': [
      {'path': 'lib/core/', 'layer': 'platform'},
      {'path': 'lib/routing/', 'layer': 'app'},
      {'path': 'lib/activity/', 'layer': 'kernel'},
      {'path': 'lib/events/', 'context': 'events'},
      {
        'path': 'lib/events/domain/event_participation.dart',
        'context': 'bookings',
      },
      {'path': 'lib/tickets/', 'context': 'bookings'},
    ],
  }),
);

List<String> _contextRules(String path, String source, {ContextMap? map}) {
  final unit = parseString(content: source, throwIfDiagnostics: false).unit;
  return [
    for (final finding in contextMapFindings(
      relativePath: path,
      unit: unit,
      map: map ?? _map,
    ))
      finding.code,
  ];
}

List<String> _ignoreProblems(String path, String source) {
  final unit = parseString(content: source, throwIfDiagnostics: false).unit;
  return [
    for (final finding in ignorePolicyFindings(
      relativePath: path,
      source: source,
      unit: unit,
      findings: dependencyDirectionFindings(
        relativePath: path,
        source: source,
        unit: unit,
      ),
    ))
      finding.reason,
  ];
}

void main() {
  group('domain layer', () {
    test('flags framework and non-allowlisted package imports', () {
      for (final uri in const [
        'package:cloud_firestore/cloud_firestore.dart',
        'package:url_launcher/url_launcher.dart',
      ]) {
        expect(_rules('lib/events/domain/event.dart', "import '$uri';\n"), [
          ArchitectureCodes.domainFrameworkImport,
        ]);
      }
    });

    test('allows pure Dart, annotation, collection and app imports', () {
      expect(
        _rules('lib/events/domain/event.dart', '''
import 'dart:convert';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:collection/collection.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:meta/meta.dart';
import 'package:pub_semver/pub_semver.dart';
'''),
        isEmpty,
      );
    });

    test('flags DateTime.now, in domain files only', () {
      const call =
          'class Event { bool get isPast => t.isBefore(DateTime.now()); }';
      expect(_rules('lib/events/domain/event.dart', call), [
        ArchitectureCodes.domainClockAccess,
      ]);
      expect(_rules('lib/kernel/clock.dart', call), [
        ArchitectureCodes.domainClockAccess,
      ]);
      expect(
        _rules(
          'lib/events/domain/event.dart',
          'bool past(DateTime now) => false;',
        ),
        isEmpty,
      );
      expect(_rules('lib/events/presentation/e_screen.dart', call), isEmpty);
    });

    test('clock access reads code, not comments or strings', () {
      const source = r'''
// 🌟 DateTime.now() is documentation
final example = r'${DateTime.now()}';
final value = '${DateTime /* comment */ . now()}';
''';
      final findings = _direction('lib/sample/domain/model.dart', source);
      expect(findings.map((finding) => finding.code), [
        ArchitectureCodes.domainClockAccess,
      ]);
      expect(
        source.substring(0, findings.single.offset).split('\n'),
        hasLength(3),
      );
      expect(
        _rules(
          'lib/sample/domain/model.dart',
          'final value = MyDateTime.now();',
        ),
        isEmpty,
      );
    });

    test('directives inside comments and strings do not count', () {
      expect(
        _rules('lib/sample/domain/model.dart', """
/* outer /* nested */
import 'package:flutter/widgets.dart';
*/
final documentation = r'''
import 'package:flutter/widgets.dart';
DateTime.now()
''';
// import '../presentation/widget.dart'; DateTime.now()
final example = "DateTime.now()";
class Sample {}
"""),
        isEmpty,
      );
    });

    test('context domain and kernel files follow the domain rules', () {
      expect(
        _rules(
          'lib/contexts/events/domain/event.dart',
          "import 'package:cloud_firestore/cloud_firestore.dart';\n",
        ),
        [ArchitectureCodes.domainFrameworkImport],
      );
      expect(
        _rules(
          'lib/kernel/ids.dart',
          "import 'package:flutter/widgets.dart';\n",
        ),
        [ArchitectureCodes.domainFrameworkImport],
      );
    });
  });

  group('data and domain imports of presentation', () {
    test('relative and package forms are equal', () {
      for (final layer in const ['data', 'domain']) {
        for (final uri in const [
          '../presentation/widget.dart',
          '../domain/../presentation/widget.dart',
          '../%70resentation/widget.dart',
          'package:catch_dating_app/sample/presentation/widget.dart',
        ]) {
          expect(_rules('lib/sample/$layer/model.dart', "import '$uri';"), [
            ArchitectureCodes.dataDomainPresentationImport,
          ], reason: uri);
        }
      }
    });

    test('context data must not import actions, parts or screens', () {
      for (final target in const [
        'package:catch_dating_app/contexts/bookings/actions/check_in_controller.dart',
        'package:catch_dating_app/contexts/bookings/parts/guest_row.dart',
        'package:catch_dating_app/pages/event_page/event_page_body.dart',
        '../actions/check_in_controller.dart',
      ]) {
        expect(
          _rules(
            'lib/contexts/bookings/data/booking_repository.dart',
            "import '$target';\n",
          ),
          [ArchitectureCodes.dataDomainPresentationImport],
          reason: target,
        );
      }
    });

    test('every conditional URI counts, on its own line', () {
      const source = '''
// Emoji keeps offsets honest: 🌟
  import '../domain/model.dart'
    if (dart.library.io) '../presentation/widget.dart'
    if (dart.library.html) 'package:flutter/widgets.dart' as ui show Widget;
''';
      final findings = _direction('lib/sample/domain/model.dart', source);
      expect(findings.map((finding) => finding.code), [
        ArchitectureCodes.dataDomainPresentationImport,
        ArchitectureCodes.domainFrameworkImport,
      ]);
      expect(
        source.substring(findings.first.offset).startsWith("'../presentation"),
        isTrue,
      );
      expect(
        _rules(
          'lib/sample/presentation/sample_widget.dart',
          "import 'local.dart' if (dart.library.io) 'package:image_picker/image_picker.dart' deferred as picker;",
        ),
        [ArchitectureCodes.presentationPluginImport],
      );
    });
  });

  group('sibling feature presentation', () {
    test('flags widget imports and keeps widget or state imports as debt', () {
      expect(
        _rules(
          'lib/dashboard/presentation/widgets/dashboard_full.dart',
          "import 'package:catch_dating_app/events/presentation/widgets/event_tiles/event_tiles.dart';\n",
        ),
        [ArchitectureCodes.crossFeaturePresentationImport],
      );
      expect(
        _rules(
          'lib/dashboard/presentation/widgets/dashboard_full.dart',
          "import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';\n",
        ),
        [ArchitectureCodes.crossFeaturePresentationImport],
      );
      expect(
        _rules(
          'lib/user_profile/presentation/self_profile_screen_state.dart',
          "import 'package:catch_dating_app/image_uploads/presentation/photo_upload_controller.dart';\n",
        ),
        [ArchitectureCodes.crossFeaturePresentationImport],
      );
    });

    test('allows controller seams from screens and controllers', () {
      expect(
        _rules(
          'lib/events/presentation/event_detail_screen.dart',
          "import 'package:catch_dating_app/organizers/presentation/detail/organizer_host_contact_controller.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/auth/presentation/auth_session_controller.dart',
          "import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';\n",
        ),
        isEmpty,
      );
    });

    test('allows same-feature and core imports', () {
      expect(
        _rules('lib/events/presentation/event_detail_screen.dart', '''
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
'''),
        isEmpty,
      );
    });

    test('relative imports keep the same seams', () {
      const source = '''
import '../../core/presentation/widget.dart';
import 'widgets/local.dart';
import '../../other/presentation/other_controller.dart';
''';
      expect(
        _rules('lib/sample/presentation/sample_screen.dart', source),
        isEmpty,
      );
      expect(_rules('lib/sample/presentation/sample_widget.dart', source), [
        ArchitectureCodes.crossFeaturePresentationImport,
      ]);
    });
  });

  group('stream timeouts', () {
    test('flags data timeouts', () {
      expect(
        _rules(
          'lib/events/data/event_repository.dart',
          'final stream = snapshots().timeout(const Duration(seconds: 5));\n',
        ),
        [ArchitectureCodes.dataStreamTimeout],
      );
      expect(
        _rules(
          'lib/contexts/events/data/event_repository.dart',
          'Stream<int> watch() => source.timeout(limit);\n',
        ),
        [ArchitectureCodes.dataStreamTimeout],
      );
      expect(
        _rules(
          'lib/events/data/event_repository.dart',
          'final stream = snapshots().map((snapshot) => snapshot.docs);\n',
        ),
        isEmpty,
      );
    });

    test('honors the override comment on the line or the line above', () {
      expect(
        _rules('lib/events/data/event_repository.dart', '''
// architecture:allow stream-timeout -- reason: non-Firestore socket deadline
final stream = socketEvents.timeout(const Duration(seconds: 5));
'''),
        isEmpty,
      );
      expect(
        _rules(
          'lib/events/data/event_repository.dart',
          'final stream = socketEvents.timeout(const Duration(seconds: 5)); // architecture:allow stream-timeout -- reason: protocol deadline\n',
        ),
        isEmpty,
      );
    });
  });

  group('presentation boundaries', () {
    test('plugin imports belong in controllers, services and actions', () {
      expect(
        _rules(
          'lib/events/presentation/widgets/event_pins_map.dart',
          "import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;\n",
        ),
        [ArchitectureCodes.presentationPluginImport],
      );
      expect(
        _rules(
          'lib/hosts/presentation/create_event_controller.dart',
          "import 'package:image_picker/image_picker.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/events/presentation/location_service.dart',
          "import 'package:geolocator/geolocator.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/events/presentation/event_detail_screen.dart',
          "import 'package:intl/intl.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _rules('lib/contexts/bookings/actions/check_in.dart', '''
import 'package:mobile_scanner/mobile_scanner.dart';
final repository = ref.read(bookingRepositoryProvider);
'''),
        isEmpty,
      );
    });

    test('WidgetRef stops at route build methods', () {
      expect(
        _rules(
          'lib/explore/presentation/widgets/explore_body.dart',
          'List<Widget> buildRows(BuildContext context, WidgetRef ref) => [];\n',
        ),
        [ArchitectureCodes.widgetRefParameter],
      );
      expect(
        _rules(
          'lib/explore/presentation/explore_screen.dart',
          'class ExploreScreen extends ConsumerWidget { Widget build(BuildContext context, WidgetRef ref) => const SizedBox(); }\n',
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/explore/presentation/explore_screen.dart',
          'class E extends ConsumerWidget { Widget build(BuildContext context, WidgetRef ref) => Consumer(builder: (BuildContext c, WidgetRef inner, _) => x); }\n',
        ),
        [ArchitectureCodes.widgetRefParameter],
      );
    });

    test('widgets read repositories through a controller or view model', () {
      expect(
        _rules(
          'lib/explore/presentation/widgets/explore_city_picker.dart',
          'final cities = ref.watch(cityRepositoryProvider);\n',
        ),
        [ArchitectureCodes.widgetRepositoryProviderRead],
      );
      // The old scanner's regex stopped at a line break after `ref`.
      expect(
        _rules(
          'lib/explore/presentation/widgets/explore_city_picker.dart',
          'final cities = ref\n    .watch(cityRepositoryProvider)\n    .all();\n',
        ),
        [ArchitectureCodes.widgetRepositoryProviderRead],
      );
      for (final allowed in const [
        'lib/explore/presentation/explore_view_model.dart',
        'lib/explore/presentation/explore_cross_paths_provider.dart',
        'lib/explore/presentation/explore_controller.dart',
      ]) {
        expect(
          _rules(
            allowed,
            'final repository = ref.watch(exploreRepositoryProvider);\n',
          ),
          isEmpty,
          reason: allowed,
        );
      }
    });

    test('barrels annotate presentation exports', () {
      expect(
        _rules(
          'lib/events/events.dart',
          "export 'presentation/event_detail_screen.dart';\n",
        ),
        [ArchitectureCodes.barrelPresentationExport],
      );
      expect(
        _rules(
          'lib/events/events.dart',
          "export 'presentation/event_detail_screen.dart'; // public-api: route entry point\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/events/events.dart',
          "// public-api: route entry point\nexport 'presentation/event_detail_screen.dart';\n",
        ),
        isEmpty,
      );
      // A doc comment above the export is not where the annotation is read from.
      expect(
        _rules(
          'lib/events/events.dart',
          "/// ## Screens\nexport 'presentation/event_detail_screen.dart'; // public-api: route entry point\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          'lib/events/presentation/widgets/event_tiles.dart',
          "export 'presentation/event_detail_screen.dart';\n",
        ),
        isEmpty,
      );
    });

    test('state files and context parts stay provider-free', () {
      const path = 'lib/chats/presentation/chat_route_state.dart';
      expect(
        _rules(
          path,
          "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
        ),
        [ArchitectureCodes.stateFileProviderCoupling],
      );
      expect(_rules(path, 'final value = Provider<int>((ref) => 1);\n'), [
        ArchitectureCodes.manualProviderDeclaration,
        ArchitectureCodes.stateFileProviderCoupling,
      ]);
      expect(
        _rules(path, 'class ChatRouteState { const ChatRouteState(); }\n'),
        isEmpty,
      );
      expect(
        _rules(
          'lib/contexts/events/parts/event_row.dart',
          "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
        ),
        [ArchitectureCodes.partsProviderCoupling],
      );
      expect(
        _rules(
          'lib/contexts/events/parts/event_row.dart',
          'final row = ref.watch(eventProvider);\n',
        ),
        [ArchitectureCodes.partsProviderCoupling],
      );
    });

    test('display state classes live in state files', () {
      const source = '''
class HostOrganizersScreenState {
  const HostOrganizersScreenState();
  factory HostOrganizersScreenState.from(Object source) => const HostOrganizersScreenState();
}
''';
      expect(
        _rules('lib/hosts/presentation/host_operations_screen.dart', source),
        [ArchitectureCodes.misplacedStateClass],
      );
      expect(
        _rules('lib/hosts/presentation/host_clubs_screen_state.dart', source),
        isEmpty,
      );
    });

    test('one route screen per file', () {
      expect(
        _rules('lib/hosts/presentation/host_operations_screen.dart', '''
class HostOperationsHomeScreen extends StatelessWidget {}
class HostOrganizersScreen extends ConsumerWidget {}
'''),
        [ArchitectureCodes.multiRouteScreenFile],
      );
      expect(
        _rules(
          'lib/hosts/presentation/host_clubs_screen.dart',
          'class HostOrganizersScreen extends StatelessWidget {}\n',
        ),
        isEmpty,
      );
    });

    test('screen rules reach app destinations and shared pages', () {
      expect(
        _rules(
          'apps/host/lib/today/widgets/today_needs_you.dart',
          'final events = ref.watch(eventRepositoryProvider);\n',
        ),
        [ArchitectureCodes.widgetRepositoryProviderRead],
      );
      expect(
        _rules(
          'apps/host/lib/today/today_state.dart',
          "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
        ),
        [ArchitectureCodes.stateFileProviderCoupling],
      );
      expect(
        _rules(
          'lib/pages/event_page/event_page_body.dart',
          'List<Widget> rows(BuildContext context, WidgetRef ref) => [];\n',
        ),
        [ArchitectureCodes.widgetRefParameter],
      );
      expect(
        _rules(
          'apps/consumer/lib/explore/widgets/map_button.dart',
          "import 'package:url_launcher/url_launcher.dart';\n",
        ),
        [ArchitectureCodes.presentationPluginImport],
      );
      expect(
        _rules(
          'apps/consumer/lib/razorpay_checkout_adapter.dart',
          "import 'package:razorpay_flutter/razorpay_flutter.dart';\n",
        ),
        isEmpty,
      );
    });
  });

  group('providers', () {
    test('keepAlive needs a rationale in the three lines above', () {
      const path = 'lib/chats/presentation/inbox/chats_list_view_model.dart';
      expect(
        _rules(path, "@Riverpod(keepAlive: true)\nString q(Ref ref) => '';\n"),
        [ArchitectureCodes.undocumentedKeepAlive],
      );
      expect(
        _rules(
          path,
          "// keepalive: preserve search text across tab switches\n@Riverpod(keepAlive: true)\nString q(Ref ref) => '';\n",
        ),
        isEmpty,
      );
      expect(
        _rules(
          path,
          "// @Riverpod(keepAlive: true)\nString q(Ref ref) => '';\n",
        ),
        isEmpty,
      );
    });

    test('manual declarations are flagged outside the platform layer', () {
      expect(
        _rules(
          'lib/chats/presentation/chat_route_view_model.dart',
          'final stateProvider = Provider.family<ChatRouteState, Args>((ref, args) {});\n',
        ),
        [ArchitectureCodes.manualProviderDeclaration],
      );
      for (final path in const [
        'lib/core/firebase_providers.dart',
        'lib/platform/firebase_providers.dart',
      ]) {
        expect(
          _rules(
            path,
            'final firestoreProvider = Provider((ref) => FirebaseFirestore.instance);\n',
          ),
          isEmpty,
          reason: path,
        );
      }
    });

    test('every builder shape counts; comments and strings do not', () {
      final findings = _direction('lib/sample/presentation/owners.dart', '''
// final ignoredProvider = Provider<int>((ref) => 1);
final text = 'final ignoredProvider = Provider<int>((ref) => 1);';
final firstProvider = FutureProvider.autoDispose
    .family<int, String>((ref, key) async => 1);
final secondProvider = ChangeNotifierProvider.autoDispose<Owner>((ref) => Owner());
''');
      expect(findings.map((finding) => finding.code), [
        ArchitectureCodes.manualProviderDeclaration,
        ArchitectureCodes.manualProviderDeclaration,
      ]);
    });

    test('only Riverpod import prefixes count', () {
      expect(
        _rules('lib/sample/presentation/owners.dart', '''
import 'package:flutter_riverpod/flutter_riverpod.dart' as rp;
final firstProvider = rp.FutureProvider.autoDispose.family<int, String>((ref, key) async => 1);
'''),
        [ArchitectureCodes.manualProviderDeclaration],
      );
      expect(
        _rules(
          'lib/sample/presentation/owners.dart',
          'final other = other_lib.Provider<int>(1);\n',
        ),
        isEmpty,
      );
    });
  });

  group('context map', () {
    test('placement matches the map', () {
      expect(
        _map.place('lib/events/presentation/event_screen.dart')!.layer,
        'app',
      );
      expect(_map.place('lib/events/shared/event_tile.dart')!.layer, 'app');
      expect(
        _map.place('lib/events/data/event_repository.dart')!.layer,
        'context',
      );
      expect(
        _map.place('lib/events/domain/event_participation.dart')!.context,
        'bookings',
      );
      expect(
        _map
            .place('lib/contexts/bookings/data/booking_repository.dart')!
            .legacy,
        isFalse,
      );
      expect(_map.place('lib/unknown/thing.dart'), isNull);
    });

    test('flags a context importing a context declared after it', () {
      expect(
        _contextRules(
          'lib/events/domain/event.dart',
          "import 'package:catch_dating_app/events/domain/event_participation.dart';\n",
        ),
        [ArchitectureCodes.contextOrderImport],
      );
      expect(
        _contextRules(
          'lib/tickets/data/ticket_repository.dart',
          "import 'package:catch_dating_app/events/domain/event.dart';\n",
        ),
        isEmpty,
      );
    });

    test('flags upward layer imports', () {
      for (final (path, uri) in const [
        ('lib/core/widgets/event_thumbnail.dart', 'events/domain/event.dart'),
        ('lib/events/data/event_launcher.dart', 'routing/go_router.dart'),
        ('lib/pages/event_page/event_page.dart', 'routing/go_router.dart'),
        ('lib/activity/domain/activity_taxonomy.dart', 'core/labelled.dart'),
      ]) {
        expect(
          _contextRules(path, "import 'package:catch_dating_app/$uri';\n"),
          [ArchitectureCodes.upwardLayerImport],
          reason: path,
        );
      }
      expect(
        _contextRules(
          'lib/platform/firebase.dart',
          "import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';\n",
        ),
        isEmpty,
      );
    });

    test('app screens may import anything', () {
      expect(
        _contextRules('lib/events/presentation/event_screen.dart', '''
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/contexts/bookings/data/booking_repository.dart';
'''),
        isEmpty,
      );
    });

    test('contexts cross through the public API file', () {
      expect(
        _contextRules(
          'lib/contexts/bookings/domain/booking.dart',
          "import 'package:catch_dating_app/contexts/events/domain/event.dart';\n",
        ),
        [ArchitectureCodes.contextBarrelBypass],
      );
      expect(
        _contextRules(
          'lib/contexts/bookings/domain/booking.dart',
          "import 'package:catch_dating_app/contexts/events/events.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _contextRules(
          'lib/contexts/bookings/domain/booking.dart',
          "import '../data/booking_repository.dart';\n",
        ),
        isEmpty,
      );
    });

    test('flags unmapped files and undeclared contexts', () {
      expect(_contextRules('lib/weddings/domain/wedding.dart', 'class W {}'), [
        ArchitectureCodes.unmappedFile,
      ]);
      expect(
        _contextRules(
          'lib/contexts/weddings/domain/wedding.dart',
          'class W {}',
        ),
        [ArchitectureCodes.unknownContext],
      );
    });

    test('legacy barrels re-export only their own screens', () {
      expect(
        _contextRules(
          'lib/events/events.dart',
          "export 'presentation/event_screen.dart';\n",
        ),
        isEmpty,
      );
      expect(
        _contextRules(
          'lib/tickets/tickets.dart',
          "export 'package:catch_dating_app/events/presentation/event_screen.dart';\n",
        ),
        [ArchitectureCodes.upwardLayerImport],
      );
    });

    test('relative imports resolve like package imports', () {
      for (final uri in const [
        '../domain/event_participation.dart',
        'package:catch_dating_app/events/domain/event_participation.dart',
      ]) {
        expect(
          _contextRules(
            'lib/events/data/event_repository.dart',
            "import '$uri';\n",
          ),
          [ArchitectureCodes.contextOrderImport],
          reason: uri,
        );
      }
    });

    test('legacy folders keep only screens and barrels once forbidden', () {
      final strict = ContextMap.parse(
        jsonEncode({
          'roots': {
            'contexts': 'lib/contexts/',
            'pages': 'lib/pages/',
            'kernel': 'lib/kernel/',
            'platform': 'lib/platform/',
          },
          'contexts': [
            {'id': 'events', 'owns': 'Events.'},
          ],
          'legacy': [
            {'path': 'lib/events/', 'context': 'events'},
          ],
          'forbidLegacyContextFiles': true,
        }),
      );
      expect(
        _contextRules(
          'lib/events/domain/event.dart',
          'class E {}',
          map: strict,
        ),
        [ArchitectureCodes.legacyContextFile],
      );
      for (final path in const [
        'lib/events/events.dart',
        'lib/events/presentation/event_screen.dart',
        'lib/contexts/events/domain/event.dart',
      ]) {
        expect(
          _contextRules(path, 'class E {}', map: strict),
          isEmpty,
          reason: path,
        );
      }
      expect(
        _contextRules('lib/events/domain/event.dart', 'class E {}'),
        isEmpty,
      );
    });

    test('the checked-in map parses and places every lib file', () {
      final map = ContextMap.parse(
        File('tool/architecture/context_map.json').readAsStringSync(),
      );
      expect(map.forbidLegacy, isTrue);
      final unplaced = [
        for (final entity in Directory('lib').listSync(recursive: true))
          if (entity is File &&
              entity.path.endsWith('.dart') &&
              !entity.path.endsWith('.g.dart') &&
              !entity.path.endsWith('.freezed.dart') &&
              map.place(entity.path) == null)
            entity.path,
      ];
      expect(unplaced, isEmpty);
    });
  });

  group('exceptions', () {
    const legacy = 'lib/chats/presentation/chat_route_view_model.dart';
    const provider = 'final aProvider = Provider<int>((ref) => 1);\n';
    const code = 'catch_ui_lints/catch_arch_manual_provider_declaration';

    test('a reasoned ignore on a legacy file is accepted', () {
      expect(
        _ignoreProblems(legacy, '// ignore: $code -- CAT156\n$provider'),
        isEmpty,
      );
    });

    test('an ignore needs a reason', () {
      expect(_ignoreProblems(legacy, '// ignore: $code\n$provider'), [
        contains('Say why'),
      ]);
    });

    test('file-wide ignores are refused', () {
      expect(
        _ignoreProblems(
          legacy,
          '// ignore_for_file: $code -- because\n$provider',
        ),
        [contains('not apply to the whole file')],
      );
    });

    test('a stale ignore is reported', () {
      expect(
        _ignoreProblems(legacy, '// ignore: $code -- CAT156\nclass A {}\n'),
        [contains('stale')],
      );
    });

    test('hard gates cannot be ignored', () {
      expect(
        _ignoreProblems(
          'lib/events/events.dart',
          "// ignore: catch_ui_lints/catch_arch_barrel_presentation_export -- reason\nexport 'presentation/a.dart';\n",
        ),
        [contains('holds everywhere')],
      );
    });

    test('code under the bounded-context roots carries no exceptions', () {
      expect(
        _ignoreProblems(
          'lib/contexts/events/domain/event.dart',
          "// ignore: catch_ui_lints/catch_arch_domain_framework_import -- reason\nimport 'package:flutter/widgets.dart';\n",
        ),
        [contains('carries no architecture exceptions')],
      );
    });

    test('other diagnostics in ignore comments are left alone', () {
      expect(
        _ignoreProblems(legacy, '// ignore: avoid_print\nprint(1);\n'),
        isEmpty,
      );
    });
  });
}
