part of 'program_models.dart';

enum ProgramRsvpStatus { pending, attending, declined, maybe }

enum ProgramFunctionAttendanceStatus { expected, checkedIn, noShow }

enum ProgramFunctionInvitationMode { allGuests, selectedGuests }

enum ProgramDoorAction {
  checkIn,
  undoCheckIn,
  markNoShow,
  walkInCreate,
  partySizeAdjust,
}

class ProgramDoorFunction {
  const ProgramDoorFunction({
    required this.name,
    required this.invitationMode,
    required this.checkInEnabled,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    this.venueName,
    this.venueNotes,
    this.dressCode,
    this.instructions,
    required this.expectedCount,
    required this.checkedInCount,
  });

  factory ProgramDoorFunction.fromMap(Map<Object?, Object?> map) =>
      ProgramDoorFunction(
        name: requiredString(map, 'name'),
        invitationMode: ProgramFunctionInvitationMode.values.byName(
          requiredString(map, 'invitationMode'),
        ),
        checkInEnabled: map['checkInEnabled'] == true,
        status: ProgramFunctionStatus.values.byName(
          requiredString(map, 'status'),
        ),
        startsAt: requiredDateTime(map, 'startsAtMillis'),
        endsAt: requiredDateTime(map, 'endsAtMillis'),
        venueName: map['venueName'] as String?,
        venueNotes: map['venueNotes'] as String?,
        dressCode: map['dressCode'] as String?,
        instructions: map['instructions'] as String?,
        expectedCount: requiredInt(map, 'expectedCount'),
        checkedInCount: requiredInt(map, 'checkedInCount'),
      );

  final String name;
  final ProgramFunctionInvitationMode invitationMode;
  final bool checkInEnabled;
  final ProgramFunctionStatus status;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? venueName;
  final String? venueNotes;
  final String? dressCode;
  final String? instructions;
  final int expectedCount;
  final int checkedInCount;
}

class ProgramDoorCounts {
  const ProgramDoorCounts({
    required this.listedCount,
    required this.expectedHeads,
    required this.checkedInHeads,
    required this.checkedInParties,
    required this.noShowCount,
    required this.walkInCount,
  });

  factory ProgramDoorCounts.fromMap(Map<Object?, Object?> map) =>
      ProgramDoorCounts(
        listedCount: requiredInt(map, 'listedCount'),
        expectedHeads: requiredInt(map, 'expectedHeads'),
        checkedInHeads: requiredInt(map, 'checkedInHeads'),
        checkedInParties: requiredInt(map, 'checkedInParties'),
        noShowCount: requiredInt(map, 'noShowCount'),
        walkInCount: requiredInt(map, 'walkInCount'),
      );

  final int listedCount;
  final int expectedHeads;
  final int checkedInHeads;
  final int checkedInParties;
  final int noShowCount;
  final int walkInCount;
}

class ProgramDoorGuest {
  const ProgramDoorGuest({
    required this.guestId,
    required this.displayName,
    required this.invited,
    required this.rsvpStatus,
    required this.attendanceStatus,
    this.partySize,
    this.householdLabel,
    this.responseNote,
  });

  factory ProgramDoorGuest.fromMap(Map<Object?, Object?> map) =>
      ProgramDoorGuest(
        guestId: requiredString(map, 'guestId'),
        displayName: requiredString(map, 'displayName'),
        invited: map['invited'] == true,
        rsvpStatus: ProgramRsvpStatus.values.byName(
          requiredString(map, 'rsvpStatus'),
        ),
        attendanceStatus: ProgramFunctionAttendanceStatus.values.byName(
          requiredString(map, 'attendanceStatus'),
        ),
        partySize: map['partySize'] as int?,
        householdLabel: map['householdLabel'] as String?,
        responseNote: map['responseNote'] as String?,
      );

  final String guestId;
  final String displayName;
  final bool invited;
  final ProgramRsvpStatus rsvpStatus;
  final ProgramFunctionAttendanceStatus attendanceStatus;
  final int? partySize;
  final String? householdLabel;
  final String? responseNote;

  bool get isCheckedIn =>
      attendanceStatus == ProgramFunctionAttendanceStatus.checkedIn;
}

class ProgramDoorJournalEntry {
  const ProgramDoorJournalEntry({
    required this.journalId,
    required this.guestId,
    this.displayName,
    required this.action,
    required this.occurredAt,
    this.partySize,
    this.note,
    this.actorLabel,
  });

  factory ProgramDoorJournalEntry.fromMap(Map<Object?, Object?> map) =>
      ProgramDoorJournalEntry(
        journalId: requiredString(map, 'journalId'),
        guestId: requiredString(map, 'guestId'),
        displayName: map['displayName'] as String?,
        action: ProgramDoorAction.values.byName(requiredString(map, 'action')),
        occurredAt: requiredDateTime(map, 'occurredAtMillis'),
        partySize: map['partySize'] as int?,
        note: map['note'] as String?,
        actorLabel: map['actorLabel'] as String?,
      );

  final String journalId;
  final String guestId;
  final String? displayName;
  final ProgramDoorAction action;
  final DateTime occurredAt;
  final int? partySize;
  final String? note;
  final String? actorLabel;
}

class ProgramDoorView {
  const ProgramDoorView({
    required this.programId,
    required this.functionId,
    required this.serverTime,
    required this.accessExpiresAt,
    required this.function,
    required this.counts,
    required this.guests,
    required this.journal,
  });

  factory ProgramDoorView.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program door view');
    return ProgramDoorView(
      programId: requiredString(map, 'programId'),
      functionId: requiredString(map, 'functionId'),
      serverTime: requiredDateTime(map, 'serverTimeMillis'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      function: ProgramDoorFunction.fromMap(
        requiredMap(map['function'], 'function'),
      ),
      counts: ProgramDoorCounts.fromMap(requiredMap(map['counts'], 'counts')),
      guests: mapList(
        map['guests'],
        'guests',
      ).map(ProgramDoorGuest.fromMap).toList(growable: false),
      journal: mapList(
        map['journal'],
        'journal',
      ).map(ProgramDoorJournalEntry.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String functionId;
  final DateTime serverTime;

  /// Exclusive deadline for retaining this scoped projection; null only for
  /// organizer managers.
  final DateTime? accessExpiresAt;
  final ProgramDoorFunction function;
  final ProgramDoorCounts counts;
  final List<ProgramDoorGuest> guests;
  final List<ProgramDoorJournalEntry> journal;
}

enum ProgramDoorOperationOutcome { appended, duplicate, rejected }

enum ProgramDoorRejectionReason {
  alreadyCheckedIn,
  notCheckedIn,
  functionCheckInDisabled,
  duplicateJournalId,
  invalidTransition,
}

class ProgramDoorOperationResult {
  const ProgramDoorOperationResult({
    required this.guestId,
    required this.action,
    required this.outcome,
    this.journalId,
    this.reason,
  });

  factory ProgramDoorOperationResult.fromMap(Map<Object?, Object?> map) =>
      ProgramDoorOperationResult(
        guestId: requiredString(map, 'guestId'),
        action: ProgramDoorAction.values.byName(requiredString(map, 'action')),
        outcome: ProgramDoorOperationOutcome.values.byName(
          requiredString(map, 'outcome'),
        ),
        journalId: map['journalId'] as String?,
        reason: map['reason'] is String
            ? ProgramDoorRejectionReason.values.byName(map['reason']! as String)
            : null,
      );

  final String guestId;
  final ProgramDoorAction action;
  final ProgramDoorOperationOutcome outcome;
  final String? journalId;
  final ProgramDoorRejectionReason? reason;
}

class ProgramDoorJournalBatch {
  const ProgramDoorJournalBatch({
    required this.entityId,
    required this.revision,
    required this.results,
    required this.appendedCount,
    required this.duplicateCount,
    required this.rejectedCount,
    required this.alreadyApplied,
  });

  factory ProgramDoorJournalBatch.fromCallableData(Object? value) {
    final map = requiredMap(value, 'door journal batch');
    return ProgramDoorJournalBatch(
      entityId: requiredString(map, 'entityId'),
      revision: requiredInt(map, 'revision'),
      results: mapList(
        map['results'],
        'results',
      ).map(ProgramDoorOperationResult.fromMap).toList(growable: false),
      appendedCount: requiredInt(map, 'appendedCount'),
      duplicateCount: requiredInt(map, 'duplicateCount'),
      rejectedCount: requiredInt(map, 'rejectedCount'),
      alreadyApplied: map['alreadyApplied'] == true,
    );
  }

  final String entityId;
  final int revision;
  final List<ProgramDoorOperationResult> results;
  final int appendedCount;
  final int duplicateCount;
  final int rejectedCount;
  final bool alreadyApplied;
}
