import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/programs/presentation/program_door_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';

const _programId = 'program_kapoor_shah';
const _functionId = 'fn_sangeet';

final _now = DateTime(2026, 2, 14, 14, 30);

final _access = ProgramWorkAccess(
  programId: _programId,
  organizerId: 'org_1',
  title: 'Kapoor–Shah Wedding',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  status: ProgramStatus.active,
  actorRole: ProgramActorRole.staff,
  duties: [
    ProgramDutyAssignment(
      duty: ProgramStaffDuty.functionCheckIn,
      pickupPointIds: const {},
      hotelIds: const {},
      functionIds: const {_functionId},
      expiresAt: _now.add(const Duration(hours: 8)),
    ),
  ],
  grantExpiresAt: _now.add(const Duration(hours: 8)),
  capabilities: const {'arrivalsTransport'},
  pickupPoints: const [],
  hotels: const [],
  functions: [
    ProgramFunction(
      functionId: _functionId,
      name: 'Sangeet',
      venueName: 'The Leela Ballroom',
      startsAt: _now.add(const Duration(hours: 3)),
      endsAt: _now.add(const Duration(hours: 6)),
      checkInEnabled: true,
      status: ProgramFunctionStatus.scheduled,
      expectedCount: 12,
      checkedInCount: 4,
    ),
  ],
  vehicleClasses: const [],
);

ProgramDoorGuest _doorGuest(
  String id,
  String name, {
  ProgramRsvpStatus rsvp = ProgramRsvpStatus.attending,
  ProgramFunctionAttendanceStatus attendance =
      ProgramFunctionAttendanceStatus.expected,
  int? partySize,
  String? householdLabel,
  bool invited = true,
}) => ProgramDoorGuest(
  guestId: id,
  displayName: name,
  invited: invited,
  rsvpStatus: rsvp,
  attendanceStatus: attendance,
  partySize: partySize,
  householdLabel: householdLabel,
);

final _doorView = ProgramDoorView(
  programId: _programId,
  functionId: _functionId,
  serverTime: _now,
  accessExpiresAt: _now.add(const Duration(hours: 8)),
  function: ProgramDoorFunction(
    name: 'Sangeet',
    invitationMode: ProgramFunctionInvitationMode.selectedGuests,
    checkInEnabled: true,
    status: ProgramFunctionStatus.scheduled,
    startsAt: _now.add(const Duration(hours: 3)),
    endsAt: _now.add(const Duration(hours: 6)),
    venueName: 'The Leela Ballroom',
    dressCode: 'Festive',
    expectedCount: 12,
    checkedInCount: 4,
  ),
  counts: const ProgramDoorCounts(
    listedCount: 3,
    expectedHeads: 12,
    checkedInHeads: 4,
    checkedInParties: 1,
    noShowCount: 0,
    walkInCount: 1,
  ),
  guests: [
    _doorGuest(
      'g_rohan',
      'Rohan Sharma',
      attendance: ProgramFunctionAttendanceStatus.checkedIn,
      partySize: 3,
      householdLabel: 'Sharma household',
    ),
    _doorGuest(
      'g_nisha',
      'Nisha Rao',
      partySize: 2,
      householdLabel: 'Rao household',
    ),
    _doorGuest(
      'g_walk',
      'Priya Kapoor',
      rsvp: ProgramRsvpStatus.pending,
      attendance: ProgramFunctionAttendanceStatus.checkedIn,
      invited: false,
    ),
  ],
  journal: [
    ProgramDoorJournalEntry(
      journalId: 'j1',
      guestId: 'g_rohan',
      displayName: 'Rohan Sharma',
      action: ProgramDoorAction.checkIn,
      occurredAt: _now.subtract(const Duration(minutes: 4)),
      partySize: 3,
      actorLabel: 'Arjun',
    ),
    ProgramDoorJournalEntry(
      journalId: 'j2',
      guestId: 'g_walk',
      displayName: 'Priya Kapoor',
      action: ProgramDoorAction.walkInCreate,
      occurredAt: _now.subtract(const Duration(minutes: 9)),
      actorLabel: 'Dev',
    ),
  ],
);

class _DoorMutator implements ProgramOperationsMutator {
  @override
  Future<ProgramMutationResult> setReadiness({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    int? manualCurbAtMillis,
    String? manualCurbNote,
  }) async => const ProgramMutationResult(
    entityId: 'leg',
    revision: 2,
    alreadyApplied: false,
  );

  @override
  Future<DispatchResult> dispatchTrip({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required DateTime departedAt,
    required String clientOperationId,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
  }) async => const DispatchResult(
    tripId: 'trip_preview',
    revision: 1,
    alreadyApplied: false,
    passengerCount: 0,
  );

  @override
  Future<ProgramDoorJournalBatch> recordDoorAction({
    required String programId,
    required String functionId,
    required Map<String, Object?> operation,
  }) async => const ProgramDoorJournalBatch(
    entityId: 'fn',
    revision: 2,
    results: [],
    appendedCount: 1,
    duplicateCount: 0,
    rejectedCount: 0,
    alreadyApplied: false,
  );

  @override
  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    required String clientOperationId,
    int? partySize,
    String? note,
  }) async => const ProgramMutationResult(
    entityId: 'guest',
    revision: 1,
    alreadyApplied: false,
  );
}

List<Override> _doorOverrides() {
  return [
    programProjectionClockProvider.overrideWithValue(() => _now),
    uidProvider.overrideWithValue(const AsyncData<String?>('uid_greeter')),
    programOperationsOutboxProvider.overrideWithValue(
      ProgramOperationsOutbox(
        createProgramOperationJournal(
          storage: () async => MemoryCommandJournalStorage(),
          currentAccountId: () => 'uid_greeter',
        ),
        _DoorMutator(),
      ),
    ),
    isObviouslyOfflineProvider.overrideWithValue(false),
    programWorkEntryProvider(_programId, null).overrideWithValue(
      AsyncData((value: _access, snapshotAt: null, snapshotExpiresAt: null)),
    ),
    programFunctionDoorViewProvider(
      _programId,
      _functionId,
    ).overrideWithValue(AsyncData(_doorView)),
    programFunctionDoorViewWithSnapshotProvider(
      _programId,
      _functionId,
    ).overrideWithValue(
      AsyncData((value: _doorView, snapshotAt: null, snapshotExpiresAt: null)),
    ),
  ];
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: ProgramFunctionDoorScreen,
  path: '[P1 product surfaces]/Program door',
)
Widget programDoorScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramFunctionDoorScreen',
    contractId: 'screen.programs.door',
    children: [
      WidgetbookPageStateCard(
        label: 'open door',
        child: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: _doorOverrides(),
            child: const ProgramFunctionDoorScreen(
              programId: _programId,
              functionId: _functionId,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: ProgramDoorGuestRow,
  path: '[P1 product surfaces]/Program door',
)
Widget programDoorGuestRowStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramDoorGuestRow',
    catalogId: 'screen.programs.door',
    children: [
      ProgramDoorGuestRow(
        guest: _doorView.guests[0],
        doorOpen: true,
        queuedStatus: null,
        onAction: (_) {},
      ),
      ProgramDoorGuestRow(
        guest: _doorView.guests[1],
        doorOpen: true,
        queuedStatus: ProgramOperationOutboxStatus.pending,
        onAction: (_) {},
      ),
      ProgramDoorGuestRow(
        guest: _doorView.guests[2],
        doorOpen: false,
        queuedStatus: null,
        onAction: (_) {},
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sheet states',
  type: ProgramDoorPartySizeSheet,
  path: '[P1 product surfaces]/Program door',
)
Widget programDoorPartySizeSheetStates(BuildContext context) {
  return WidgetbookUtilitySheetFrame(
    child: ProgramDoorPartySizeSheet(guest: _doorView.guests[0]),
  );
}

@widgetbook.UseCase(
  name: 'Body states',
  type: ProgramDoorPageBody,
  path: '[P1 product surfaces]/Program door',
)
Widget programDoorPageBodyStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProgramDoorPageBody',
    contractId: 'screen.programs.door',
    children: [
      WidgetbookPageStateCard(
        label: 'open roster',
        child: WidgetbookUtilityDeviceFrame(
          child: ProgramDoorPageBody(
            view: _doorView,
            programId: _programId,
            outbox: const ProgramOperationOutboxSummary([]),
            operationsBusy: false,
            showOperationsNotice: false,
            walkInName: TextEditingController(),
            walkInPartySize: TextEditingController(),
            onGuestAction: (_, action) {},
            onSubmitWalkIn: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Badge states',
  type: ProgramDoorAttendanceBadge,
  path: '[P1 product surfaces]/Program door',
)
Widget programDoorAttendanceBadgeStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'ProgramDoorAttendanceBadge',
    catalogId: 'screen.programs.door',
    children: const [
      ProgramDoorAttendanceBadge(
        status: ProgramFunctionAttendanceStatus.expected,
      ),
      ProgramDoorAttendanceBadge(
        status: ProgramFunctionAttendanceStatus.checkedIn,
      ),
      ProgramDoorAttendanceBadge(
        status: ProgramFunctionAttendanceStatus.noShow,
      ),
    ],
  );
}
