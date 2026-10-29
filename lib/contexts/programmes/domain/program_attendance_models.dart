part of 'program_models.dart';

class ProgramAttendanceExceptions {
  const ProgramAttendanceExceptions({
    required this.invitedNoResponseGuestIds,
    required this.declinedCheckedInGuestIds,
    required this.noShowGuestIds,
    required this.walkInGuestIds,
  });

  factory ProgramAttendanceExceptions.fromMap(Map<Object?, Object?> map) {
    return ProgramAttendanceExceptions(
      invitedNoResponseGuestIds: stringList(map['invitedNoResponseGuestIds']),
      declinedCheckedInGuestIds: stringList(map['declinedCheckedInGuestIds']),
      noShowGuestIds: stringList(map['noShowGuestIds']),
      walkInGuestIds: stringList(map['walkInGuestIds']),
    );
  }

  final List<String> invitedNoResponseGuestIds;
  final List<String> declinedCheckedInGuestIds;
  final List<String> noShowGuestIds;
  final List<String> walkInGuestIds;

  int get count =>
      invitedNoResponseGuestIds.length +
      declinedCheckedInGuestIds.length +
      noShowGuestIds.length +
      walkInGuestIds.length;
}

/// One function's RSVP-vs-door attendance reconciliation counts.
class ProgramFunctionAttendance {
  const ProgramFunctionAttendance({
    required this.functionId,
    required this.invitedGuests,
    required this.respondedGuests,
    required this.attendingGuests,
    required this.attendingHeads,
    required this.maybeGuests,
    required this.declinedGuests,
    required this.noResponseGuests,
    required this.checkedInGuests,
    required this.checkedInHeads,
    required this.noShowGuests,
    required this.expectedGuests,
    required this.walkInGuests,
    required this.walkInHeads,
    required this.exceptions,
  });

  factory ProgramFunctionAttendance.fromMap(Map<Object?, Object?> map) {
    return ProgramFunctionAttendance(
      functionId: requiredString(map, 'functionId'),
      invitedGuests: requiredInt(map, 'invitedGuests'),
      respondedGuests: requiredInt(map, 'respondedGuests'),
      attendingGuests: requiredInt(map, 'attendingGuests'),
      attendingHeads: requiredInt(map, 'attendingHeads'),
      maybeGuests: requiredInt(map, 'maybeGuests'),
      declinedGuests: requiredInt(map, 'declinedGuests'),
      noResponseGuests: requiredInt(map, 'noResponseGuests'),
      checkedInGuests: requiredInt(map, 'checkedInGuests'),
      checkedInHeads: requiredInt(map, 'checkedInHeads'),
      noShowGuests: requiredInt(map, 'noShowGuests'),
      expectedGuests: requiredInt(map, 'expectedGuests'),
      walkInGuests: requiredInt(map, 'walkInGuests'),
      walkInHeads: requiredInt(map, 'walkInHeads'),
      exceptions: ProgramAttendanceExceptions.fromMap(
        requiredMap(map['exceptions'], 'exceptions'),
      ),
    );
  }

  final String functionId;
  final int invitedGuests;
  final int respondedGuests;
  final int attendingGuests;
  final int attendingHeads;
  final int maybeGuests;
  final int declinedGuests;
  final int noResponseGuests;
  final int checkedInGuests;
  final int checkedInHeads;
  final int noShowGuests;
  final int expectedGuests;
  final int walkInGuests;
  final int walkInHeads;
  final ProgramAttendanceExceptions exceptions;
}

/// The reconciliationViewer's program-wide attendance report.
class ProgramAttendanceReport {
  const ProgramAttendanceReport({
    required this.programId,
    required this.serverTime,
    required this.accessExpiresAt,
    required this.programGuests,
    required this.programInvitedGuests,
    required this.programAttendingGuests,
    required this.programCheckedInGuests,
    required this.programNoShowGuests,
    required this.functions,
  });

  factory ProgramAttendanceReport.fromCallableData(Object? value) {
    final map = requiredMap(value, 'attendance report');
    return ProgramAttendanceReport(
      programId: requiredString(map, 'programId'),
      serverTime: requiredDateTime(map, 'serverTimeMillis'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      programGuests: requiredInt(map, 'programGuests'),
      programInvitedGuests: requiredInt(map, 'programInvitedGuests'),
      programAttendingGuests: requiredInt(map, 'programAttendingGuests'),
      programCheckedInGuests: requiredInt(map, 'programCheckedInGuests'),
      programNoShowGuests: requiredInt(map, 'programNoShowGuests'),
      functions: mapList(
        map['functions'],
        'functions',
      ).map(ProgramFunctionAttendance.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final DateTime serverTime;
  final DateTime? accessExpiresAt;
  final int programGuests;
  final int programInvitedGuests;
  final int programAttendingGuests;
  final int programCheckedInGuests;
  final int programNoShowGuests;
  final List<ProgramFunctionAttendance> functions;
}

/// Counts-only overview rows for stakeholderViewer staff — ids and
/// headcounts, never names. Function rows key on functionId so the screen
/// joins names from the work-access payload.
