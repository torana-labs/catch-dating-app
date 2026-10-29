import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_door_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

const _doorViewData = {
  'programId': 'program',
  'functionId': 'function',
  'serverTimeMillis': 1760000000000,
  'accessExpiresAtMillis': 1760003600000,
  'function': {
    'name': 'Sangeet',
    'invitationMode': 'selectedGuests',
    'checkInEnabled': true,
    'status': 'scheduled',
    'startsAtMillis': 1760000000000,
    'endsAtMillis': 1760007200000,
    'venueName': 'Courtyard',
    'venueNotes': null,
    'dressCode': 'Festive',
    'instructions': null,
    'expectedCount': 40,
    'checkedInCount': 3,
  },
  'counts': {
    'listedCount': 41,
    'expectedHeads': 60,
    'checkedInHeads': 5,
    'checkedInParties': 3,
    'noShowCount': 1,
    'walkInCount': 1,
  },
  'guests': [
    {
      'guestId': 'invited',
      'displayName': 'Invited Guest',
      'invited': true,
      'rsvpStatus': 'attending',
      'attendanceStatus': 'checkedIn',
      'partySize': 2,
      'householdLabel': 'Mehta household',
      'responseNote': null,
    },
    {
      'guestId': 'walk-in',
      'displayName': 'Door Walk In',
      'invited': false,
      'rsvpStatus': 'pending',
      'attendanceStatus': 'expected',
      'partySize': null,
      'householdLabel': null,
      'responseNote': 'Arrived with family',
    },
  ],
  'journal': [
    {
      'journalId': 'j-1',
      'guestId': 'invited',
      'displayName': 'Invited Guest',
      'action': 'checkIn',
      'occurredAtMillis': 1760001000000,
      'partySize': 2,
      'note': null,
      'actorLabel': 'Door staff',
    },
    {
      'journalId': 'j-2',
      'guestId': 'walk-in',
      'displayName': 'Door Walk In',
      'action': 'walkInCreate',
      'occurredAtMillis': 1760002000000,
      'partySize': null,
      'note': 'Arrived with family',
      'actorLabel': 'Door staff',
    },
  ],
};

void main() {
  final now = DateTime(2026, 2, 1, 12);

  ProgramWorkAccess access(List<ProgramDutyAssignment> duties) =>
      ProgramWorkAccess(
        programId: 'program',
        organizerId: 'org',
        title: 'Program',
        kind: ProgramKind.wedding,
        timezone: 'Asia/Kolkata',
        status: ProgramStatus.active,
        actorRole: ProgramActorRole.staff,
        duties: duties,
        grantExpiresAt: now.add(const Duration(hours: 6)),
        capabilities: const {},
        pickupPoints: const [],
        hotels: const [],
        functions: const [],
        vehicleClasses: const [],
      );

  group('ProgramDoorView contract parse', () {
    test('parses function, counts, guests, and journal', () {
      final view = ProgramDoorView.fromCallableData(_doorViewData);
      expect(view.function.name, 'Sangeet');
      expect(
        view.function.invitationMode,
        ProgramFunctionInvitationMode.selectedGuests,
      );
      expect(view.counts.walkInCount, 1);
      expect(view.accessExpiresAt, isNotNull);
      expect(view.guests, hasLength(2));
      expect(view.guests.first.householdLabel, 'Mehta household');
      expect(view.guests.first.isCheckedIn, isTrue);
      expect(view.guests.last.invited, isFalse);
      expect(view.journal.last.action, ProgramDoorAction.walkInCreate);
      expect(view.journal.last.occurredAt, isNotNull);
    });

    test('batch results keep per-operation outcomes', () {
      final batch = ProgramDoorJournalBatch.fromCallableData({
        'entityId': 'function',
        'revision': 7,
        'appendedCount': 1,
        'duplicateCount': 1,
        'rejectedCount': 1,
        'alreadyApplied': false,
        'results': [
          {
            'guestId': 'a',
            'action': 'checkIn',
            'outcome': 'appended',
            'journalId': 'j-9',
            'reason': null,
          },
          {
            'guestId': 'a',
            'action': 'checkIn',
            'outcome': 'duplicate',
            'journalId': 'j-9',
            'reason': 'duplicateJournalId',
          },
          {
            'guestId': 'b',
            'action': 'undoCheckIn',
            'outcome': 'rejected',
            'journalId': null,
            'reason': 'notCheckedIn',
          },
        ],
      });
      expect(batch.results.map((r) => r.outcome), [
        ProgramDoorOperationOutcome.appended,
        ProgramDoorOperationOutcome.duplicate,
        ProgramDoorOperationOutcome.rejected,
      ]);
      expect(
        batch.results.last.reason,
        ProgramDoorRejectionReason.notCheckedIn,
      );
    });
  });

  group('door function access policy', () {
    ProgramDutyAssignment door(Set<String> functionIds, {DateTime? expiresAt}) =>
        ProgramDutyAssignment(
          duty: ProgramStaffDuty.functionCheckIn,
          pickupPointIds: const {},
          hotelIds: const {},
          functionIds: functionIds,
          expiresAt: expiresAt ?? now.add(const Duration(hours: 6)),
        );

    test('scoped check-in reads only assigned functions', () {
      final work = access([door(const {'a'})]);
      expect(
        canReadProgramFunction(work, 'a', now: now),
        isTrue,
      );
      expect(
        canReadProgramFunction(work, 'b', now: now),
        isFalse,
      );
    });

    test('empty function scope means every function', () {
      final work = access([door(const {})]);
      expect(canReadProgramFunction(work, 'a', now: now), isTrue);
      expect(canReadProgramFunction(work, 'b', now: now), isTrue);
    });

    test('non-door duties never read function rosters', () {
      final work = access([
        ProgramDutyAssignment(
          duty: ProgramStaffDuty.hotelDesk,
          pickupPointIds: const {},
          hotelIds: const {'h'},
          functionIds: const {},
          expiresAt: now.add(const Duration(hours: 6)),
        ),
      ]);
      expect(canReadProgramFunction(work, 'a', now: now), isFalse);
    });

    test('expired door assignment loses function access', () {
      final work = access([
        door(const {'a'}, expiresAt: now.subtract(const Duration(minutes: 1))),
      ]);
      expect(canReadProgramFunction(work, 'a', now: now), isFalse);
    });

    test('managers read any function', () {
      final work = const ProgramWorkAccess(
        programId: 'program',
        organizerId: 'org',
        title: 'Program',
        kind: ProgramKind.wedding,
        timezone: 'Asia/Kolkata',
        status: ProgramStatus.active,
        actorRole: ProgramActorRole.manager,
        duties: [],
        grantExpiresAt: null,
        capabilities: <String>{},
        pickupPoints: [],
        hotels: [],
        functions: [],
        vehicleClasses: [],
      );
      expect(canReadProgramFunction(work, 'a', now: now), isTrue);
    });
  });

  group('door outbox entries', () {
    test('door action round-trips through the journal codec', () {
      final entry = ProgramOperationOutboxEntry.doorAction(
        programId: 'program',
        functionId: 'function',
        guestId: 'guest',
        action: 'checkIn',
        clientOperationId: 'op-1',
        createdAt: now,
        partySize: 2,
      );
      final decoded = ProgramOperationOutboxEntry.fromJson(entry.toJson());
      expect(decoded.kind, ProgramOperationKind.doorAction);
      expect(decoded.payload['partySize'], 2);
      expect(decoded.affectsDoorGuest('function', 'guest'), isTrue);
      expect(decoded.affectsDoorGuest('function', 'other'), isFalse);
    });

    test('walk-in entry validates and groups by function', () {
      final entry = ProgramOperationOutboxEntry.walkIn(
        programId: 'program',
        functionId: 'function',
        displayName: 'Door Walk In',
        clientOperationId: 'op-2',
        createdAt: now,
        note: 'Arrived with family',
      );
      final decoded = ProgramOperationOutboxEntry.fromJson(entry.toJson());
      expect(decoded.kind, ProgramOperationKind.walkIn);
      final summary = ProgramOperationOutboxSummary([decoded]);
      expect(summary.walkInsFor('function'), hasLength(1));
      expect(summary.walkInsFor('other'), isEmpty);
      expect(summary.pendingCount, 1);
    });

    test('persisted journal rejects corrupt door payloads', () {
      final entry = ProgramOperationOutboxEntry.doorAction(
        programId: 'program',
        functionId: 'function',
        guestId: 'guest',
        action: 'checkIn',
        clientOperationId: 'op-3',
        createdAt: now,
      );
      final corrupt = entry.toJson();
      (corrupt['payload']! as Map<String, Object?>)['action'] = 'teleport';
      expect(
        () => ProgramOperationOutboxEntry.fromJson(corrupt),
        throwsFormatException,
      );
      final badSize = entry.toJson();
      (badSize['payload']! as Map<String, Object?>)['partySize'] = 0;
      expect(
        () => ProgramOperationOutboxEntry.fromJson(badSize),
        throwsFormatException,
      );
    });
  });

  testWidgets('door page body renders roster and dispatches actions', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final view = ProgramDoorView.fromCallableData(_doorViewData);
    final name = TextEditingController();
    final party = TextEditingController();
    addTearDown(name.dispose);
    addTearDown(party.dispose);
    final actions = <(String, ProgramDoorRowAction)>[];
    var walkIns = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ProgramDoorPageBody(
          view: view,
          programId: 'program',
          outbox: const ProgramOperationOutboxSummary([]),
          operationsBusy: false,
          showOperationsNotice: false,
          walkInName: name,
          walkInPartySize: party,
          onGuestAction: (guest, action) =>
              actions.add((guest.guestId, action)),
          onSubmitWalkIn: () => walkIns++,
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Invited Guest'), findsOneWidget);
    expect(find.text('Door Walk In'), findsOneWidget);
    expect(find.text('Sangeet'), findsWidgets);

    // The walk-in submit delegates to the parent's validated callback.
    await tester.enterText(
      find.byKey(const ValueKey('door-walk-in-name')),
      'New Arrival',
    );
    await tester.tap(find.text('Register and check in'));
    await pumpFeatureUi(tester);
    expect(walkIns, 1);

    // Row action menu offers mark no-show for expected guests.
    final menus = find.byTooltip('Guest actions');
    expect(menus, findsNWidgets(2));
    await tester.tap(menus.last);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Mark no-show'));
    await pumpFeatureUi(tester);
    expect(actions, [('walk-in', ProgramDoorRowAction.markNoShow)]);
  });
}
