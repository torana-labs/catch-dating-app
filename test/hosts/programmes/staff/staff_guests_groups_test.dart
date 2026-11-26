import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_screen.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Repository extends Fake implements ProgramSetupRepository {
  final saved =
      <({String? groupId, int? revision, String? hotelId, bool clear})>[];

  /// The server's group inventory; a save adds the group with no members.
  final groups = <ProgramGuestGroupRow>[];

  @override
  Future<List<ProgramGuestGroupRow>> listGuestGroups(String programId) async =>
      List.of(groups);

  @override
  Future<List<ProgramHouseholdRow>> listHouseholds(String programId) async =>
      const [];

  final guests =
      <
        ({
          String name,
          String? household,
          List<String>? groups,
          String? phone,
          String? email,
        })
      >[];

  @override
  Future<ProgramMutationResult> upsertGuest({
    required String programId,
    required String displayName,
    String? guestId,
    int? expectedRevision,
    String? householdId,
    List<String>? groupIds,
    String? phoneE164,
    String? email,
    String? externalReference,
    String rsvpStatus = 'pending',
  }) async {
    guests.add((
      name: displayName,
      household: householdId,
      groups: groupIds,
      phone: phoneE164,
      email: email,
    ));
    return const ProgramMutationResult(
      entityId: 'g-new',
      revision: 1,
      alreadyApplied: false,
    );
  }

  @override
  Future<ProgramMutationResult> upsertGuestGroup({
    required String programId,
    required String label,
    required String dimension,
    String? groupId,
    int? expectedRevision,
    int? sortOrder,
    String? hotelId,
    bool clearHotel = false,
  }) async {
    saved.add((
      groupId: groupId,
      revision: expectedRevision,
      hotelId: hotelId,
      clear: clearHotel,
    ));
    if (groupId == null) {
      groups.add(
        ProgramGuestGroupRow(
          groupId: 'new-group',
          label: label,
          dimension: dimension,
          memberCount: 0,
          revision: 1,
          hotelId: hotelId,
        ),
      );
    }
    return ProgramMutationResult(
      entityId: groupId ?? 'new-group',
      revision: (expectedRevision ?? 0) + 1,
      alreadyApplied: false,
    );
  }
}

const _household = ProgramHouseholdRow(
  householdId: 'h-1',
  label: 'The Mehra family',
  memberGuestIds: <String>[],
  revision: 1,
);

ProgramWorkAccess _manager() => ProgramWorkAccess.fromCallableData({
  'programId': 'program',
  'organizerId': 'o-1',
  'title': 'Synthetic wedding',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'manager',
  'duties': <Map<String, Object?>>[],
  'grantExpiresAtMillis': null,
  'capabilities': <String>[],
  'pickupPoints': <Map<String, Object?>>[],
  'hotels': [
    {'hotelId': 'hotel-1', 'name': 'Lakeview'},
  ],
  'functions': <Map<String, Object?>>[],
  'vehicleClasses': <Map<String, Object?>>[],
});

Widget _app(
  _Repository repository, {
  List<ProgramGuestGroupRow> groups = const [],
}) => ProviderScope(
  retry: (_, _) => null,
  // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
  overrides: [
    programSetupRepositoryProvider.overrideWithValue(repository),
    programWorkEntryProvider('program', null).overrideWith(
      (ref) async =>
          (value: _manager(), snapshotAt: null, snapshotExpiresAt: null),
    ),
    programGuestListProvider('program').overrideWith(
      (ref) async => ProgramGuestListPage(
        programId: 'program',
        guests: const [],
        households: const [_household],
        functionGuests: const [],
        groups: groups,
      ),
    ),
    programHouseholdListProvider(
      'program',
    ).overrideWith((ref) async => const [_household]),
  ],
  child: MaterialApp(
    theme: AppTheme.light,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: const StaffGuestsScreen(programId: 'program'),
  ),
);

Future<void> _enter(WidgetTester tester, String key, String text) async {
  final field = find.descendant(
    of: find.byKey(ValueKey<String>(key)),
    matching: find.byType(TextField),
  );
  await tester.ensureVisible(field);
  await tester.enterText(field, text);
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey<String>(key));
  await tester.ensureVisible(target);
  await tester.tap(target);
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('a new group takes a hotel from the programme', (tester) async {
    final repository = _Repository();
    await tester.pumpWidget(_app(repository));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('New group'));
    await tester.tap(find.text('New group'));
    await pumpFeatureUi(tester);
    await _enter(tester, 'host-programme-group-label', 'Bride side');
    await _enter(tester, 'host-programme-group-dimension', 'side');
    await pumpFeatureUi(tester);
    await _tap(tester, 'host-programme-group-hotel-hotel-1');
    await _tap(tester, 'host-programme-group-save');
    expect(repository.saved.single.hotelId, 'hotel-1');
    expect(repository.saved.single.clear, isFalse);
    expect(repository.saved.single.groupId, isNull);
    // The new group has no members, so no guest page names it; the full
    // group list read again after the save shows it at once.
    expect(find.text('Bride side'), findsOneWidget);
    expect(find.textContaining('Staying at Lakeview'), findsOneWidget);
  });

  testWidgets('editing a group clears its hotel with revision fence', (
    tester,
  ) async {
    const group = ProgramGuestGroupRow(
      groupId: 'group-1',
      label: 'Bride side',
      dimension: 'side',
      memberCount: 4,
      revision: 7,
      hotelId: 'hotel-1',
    );
    final repository = _Repository()..groups.add(group);
    await tester.pumpWidget(_app(repository, groups: const [group]));
    await pumpFeatureUi(tester);
    expect(find.textContaining('Staying at Lakeview'), findsOneWidget);
    await _tap(tester, 'host-programme-group-group-1');
    await _tap(tester, 'host-programme-group-no-hotel');
    await _tap(tester, 'host-programme-group-save');
    expect(repository.saved.single.groupId, 'group-1');
    expect(repository.saved.single.revision, 7);
    expect(repository.saved.single.hotelId, isNull);
    expect(repository.saved.single.clear, isTrue);
  });

  testWidgets('a guest added by hand keeps blank fields empty', (tester) async {
    final repository = _Repository();
    await tester.pumpWidget(_app(repository));
    await pumpFeatureUi(tester);
    await _tap(tester, 'staff-guests-add');
    final save = find.byKey(const ValueKey('host-programme-guest-save'));
    // No name, no save.
    await tester.ensureVisible(save);
    await tester.tap(save, warnIfMissed: false);
    await pumpFeatureUi(tester);
    expect(repository.guests, isEmpty);
    await _enter(tester, 'host-programme-guest-name', '  Asha Mehra  ');
    await pumpFeatureUi(tester);
    await _tap(tester, 'host-programme-guest-household-h-1');
    // A second tap clears the household again.
    await _tap(tester, 'host-programme-guest-household-h-1');
    await _tap(tester, 'host-programme-guest-save');
    expect(repository.guests.single.name, 'Asha Mehra');
    expect(repository.guests.single.household, isNull);
    expect(repository.guests.single.groups, isNull);
    expect(repository.guests.single.phone, isNull);
    expect(repository.guests.single.email, isNull);
  });
}
