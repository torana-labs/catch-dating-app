import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_desk_screen.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod/misc.dart' show Override;

import '../test_pump_helpers.dart';

// The desk screen evaluates duties against wall-clock time; fixtures must
// expire in the real future rather than a fixed epoch.
final _now = DateTime.now();
final _later = DateTime.now().add(const Duration(days: 2));

Map<String, Object?> _access({
  required String role,
  List<Map<String, Object?>> duties = const [],
}) => {
  'programId': 'p-1',
  'organizerId': 'o-1',
  'title': 'Mehta wedding',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': role,
  'duties': duties,
  'grantExpiresAtMillis': role == 'staff'
      ? _later.millisecondsSinceEpoch
      : null,
  'capabilities': <String>[],
  'pickupPoints': <Map<String, Object?>>[],
  'hotels': <Map<String, Object?>>[],
  'functions': [
    {
      'functionId': 'fn-1',
      'name': 'Sangeet',
      'venueName': 'Ballroom',
      'startsAtMillis': _later.millisecondsSinceEpoch,
      'endsAtMillis': _later
          .add(const Duration(hours: 3))
          .millisecondsSinceEpoch,
      'checkInEnabled': true,
      'status': 'scheduled',
      'expectedCount': 12,
      'checkedInCount': 0,
    },
  ],
  'vehicleClasses': <Map<String, Object?>>[],
};

Map<String, Object?> _duty(String duty) => {
  'duty': duty,
  'pickupPointIds': <String>[],
  'hotelIds': <String>[],
  'functionIds': <String>[],
  'expiresAtMillis': _later.millisecondsSinceEpoch,
};

final _guestPage = ProgramGuestListPage.fromCallableData({
  'programId': 'p-1',
  'guests': [
    {
      'guestId': 'g-1',
      'displayName': 'Rohan Sharma',
      'householdId': null,
      'groupIds': <String>[],
      'invitationStatus': 'invited',
      'rsvpStatus': 'pending',
      'revision': 1,
    },
  ],
  'households': <Map<String, Object?>>[],
  'functionGuests': <Map<String, Object?>>[],
  'groups': <Map<String, Object?>>[],
  'nextCursor': null,
});

List<Override> _deskOverrides(Map<String, Object?> access) => [
  programWorkEntryProvider('p-1', null).overrideWith(
    (ref) async => (
      value: ProgramWorkAccess.fromCallableData(access),
      snapshotAt: null,
      snapshotExpiresAt: null,
    ),
  ),
  programGuestListProvider('p-1').overrideWithValue(AsyncData(_guestPage)),
];

void main() {
  testWidgets(
    'the staff guest desk hides coordinator mutations but keeps RSVP edits',
    (tester) async {
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => const ProgramGuestDeskScreen(programId: 'p-1'),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: _deskOverrides(
            _access(role: 'staff', duties: [_duty('guestRelations')]),
          ),
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.runAsync(flushTestEventQueue);
      await pumpFeatureUi(tester);
      expect(find.text('Rohan Sharma'), findsOneWidget);
      // RSVP editor is the sanctioned staff write path.
      expect(find.text('Attending'), findsOneWidget);
      // Coordinator-only roster mutations stay hidden.
      expect(find.text('Add guest'), findsNothing);
      expect(find.text('New group'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('program coordinators retain roster mutations on the desk', (
    tester,
  ) async {
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const ProgramGuestDeskScreen(programId: 'p-1'),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        retry: (_, _) => null,
        overrides: _deskOverrides(
          _access(role: 'staff', duties: [_duty('programCoordinator')]),
        ),
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.runAsync(flushTestEventQueue);
    await pumpFeatureUi(tester);
    expect(find.text('Rohan Sharma'), findsOneWidget);
    expect(find.text('Add guest'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  for (final scenario in <String, Map<String, Object?>>{
    'airport-only staff': _access(
      role: 'staff',
      duties: [_duty('airportGreeter')],
    ),
    'hotel-only staff': _access(role: 'staff', duties: [_duty('hotelDesk')]),
    'staff with no duty': _access(role: 'staff'),
    'expired guest relations duty': _access(
      role: 'staff',
      duties: [
        {
          ..._duty('guestRelations'),
          'expiresAtMillis': _now
              .subtract(const Duration(days: 1))
              .millisecondsSinceEpoch,
        },
      ],
    ),
    'expired staff grant': {
      ..._access(role: 'staff', duties: [_duty('guestRelations')]),
      'grantExpiresAtMillis': _now
          .subtract(const Duration(days: 1))
          .millisecondsSinceEpoch,
    },
    'manager': _access(role: 'manager'),
  }.entries) {
    testWidgets('${scenario.key} gets the correct guest desk access', (
      tester,
    ) async {
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => const ProgramGuestDeskScreen(programId: 'p-1'),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: _deskOverrides(scenario.value),
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.runAsync(flushTestEventQueue);
      await pumpFeatureUi(tester);
      if (scenario.key == 'manager') {
        expect(find.text('Rohan Sharma'), findsOneWidget);
        expect(find.text('Add guest'), findsOneWidget);
        expect(find.text('Guest desk access required'), findsNothing);
      } else {
        expect(find.text('Rohan Sharma'), findsNothing);
        expect(find.text('Add guest'), findsNothing);
        expect(find.text('Guest desk access required'), findsOneWidget);
        expect(
          find.text(
            'Ask the organizer to assign you guest relations or program coordinator duty for this program.',
          ),
          findsOneWidget,
        );
        expect(find.text('No duties assigned'), findsNothing);
        expect(
          find.text(
            'Ask the organizer to grant you an airport, hotel or dispatch duty for this program.',
          ),
          findsNothing,
        );
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
