import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_calendar.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Builds what `getProgramFunctionDoorView` returned from its listener-backed
/// sources: the function's door header, the roster rows and the newest
/// journal views. The header counts are computed here from the rows, as the
/// callable computed them, so a check-in moves them as soon as its row does.
ProgramDoorView programDoorViewFromViews({
  required ProgramAccessView access,
  required String functionId,
  required Map<Object?, Object?> header,
  required List<Map<Object?, Object?>> rows,
  required List<({String id, Map<Object?, Object?> data})> journal,
  required DateTime now,
}) {
  final guests = [for (final row in rows) ProgramDoorGuest.fromMap(row)]
    ..sort((a, b) {
      final byName = a.displayName.compareTo(b.displayName);
      return byName != 0 ? byName : a.guestId.compareTo(b.guestId);
    });
  var expectedHeads = 0;
  var checkedInHeads = 0;
  var checkedInParties = 0;
  var noShowCount = 0;
  var walkInCount = 0;
  for (final guest in guests) {
    final heads = guest.partySize ?? 1;
    if (guest.rsvpStatus == ProgramRsvpStatus.attending) expectedHeads += heads;
    if (guest.isCheckedIn) {
      checkedInHeads += heads;
      checkedInParties++;
    }
    if (guest.attendanceStatus == ProgramFunctionAttendanceStatus.noShow) {
      noShowCount++;
    }
    if (!guest.invited) walkInCount++;
  }
  return ProgramDoorView(
    programId: access.programId,
    functionId: functionId,
    serverTime: now,
    accessExpiresAt: access.doorAccessEndsAt(functionId, now),
    function: ProgramDoorFunction.fromMap(header),
    counts: ProgramDoorCounts(
      listedCount: guests.length,
      expectedHeads: expectedHeads,
      checkedInHeads: checkedInHeads,
      checkedInParties: checkedInParties,
      noShowCount: noShowCount,
      walkInCount: walkInCount,
    ),
    guests: guests,
    journal: [
      for (final entry in journal)
        ProgramDoorJournalEntry.fromMap({...entry.data, 'journalId': entry.id}),
    ],
  );
}

/// Today's functions in the programme's zone, phased by [now]: done, the one
/// on now, the first still to start (next) and the rest (later). Cancelled
/// functions are left out. The phone computes this from its clock, so a
/// function moves from next to now with no new snapshot.
List<ProgramLiveFunction> tonightFunctionsAt(
  List<Map<Object?, Object?>> functions,
  DateTime now,
  String timezone,
) {
  String dayOf(DateTime instant) {
    final day = programCalendarDateAtInstant(instant, timezone);
    return '${day.year}-${day.month}-${day.day}';
  }

  final today = dayOf(now);
  final todays =
      [
        for (final fn in functions)
          if (fn['status'] != 'cancelled' &&
              dayOf(requiredDateTime(fn, 'startsAtMillis')) == today)
            fn,
      ]..sort(
        (a, b) => requiredInt(
          a,
          'startsAtMillis',
        ).compareTo(requiredInt(b, 'startsAtMillis')),
      );
  var nextGiven = false;
  return [
    for (final fn in todays)
      () {
        final starts = requiredDateTime(fn, 'startsAtMillis');
        final ends = requiredDateTime(fn, 'endsAtMillis');
        final ProgramLivePhase phase;
        if (!ends.isAfter(now)) {
          phase = ProgramLivePhase.done;
        } else if (!starts.isAfter(now)) {
          phase = ProgramLivePhase.now;
        } else if (!nextGiven) {
          phase = ProgramLivePhase.next;
          nextGiven = true;
        } else {
          phase = ProgramLivePhase.later;
        }
        return ProgramLiveFunction(
          functionId: requiredString(fn, 'resourceId'),
          name: fn['label'] as String? ?? '',
          venueName: fn['venueName'] as String? ?? '',
          startsAt: starts,
          endsAt: ends,
          expectedCount: fn['expectedCount'] as int?,
          checkedInCount: fn['checkedInCount'] as int?,
          phase: phase,
        );
      }(),
  ];
}

/// The next instant after [now] at which a function's phase changes.
DateTime? nextPhaseChangeAfter(
  List<ProgramLiveFunction> tonight,
  DateTime now,
) {
  DateTime? next;
  for (final fn in tonight) {
    for (final instant in [fn.startsAt, fn.endsAt]) {
      if (instant.isAfter(now) && (next == null || instant.isBefore(next))) {
        next = instant;
      }
    }
  }
  return next;
}

/// The live board from its listener-backed sources: the programme's zone,
/// the function labels, the alerts this account may read, merged with their
/// resolutions, and the travel counts full reach reads. Alerts past their
/// own end are dropped, as the callable's 24 hour window dropped them.
ProgramLiveBoard programLiveBoardFromViews({
  required String programId,
  required String uid,
  required String timezone,
  required List<Map<Object?, Object?>> functions,
  required List<Map<Object?, Object?>> alerts,
  required Map<Object?, Object?>? travel,
  required DateTime now,
}) {
  final tonight = tonightFunctionsAt(functions, now, timezone);
  final live =
      [
        for (final alert in alerts)
          if (alert['expiresAtMillis'] == null ||
              requiredDateTime(alert, 'expiresAtMillis').isAfter(now))
            ProgramLiveAlert.fromMap({
              ...alert,
              'assignedToMe': alert['assigneeUid'] == uid,
            }),
      ]..sort((a, b) {
        if (a.state != b.state) {
          return a.state == ProgramAlertState.open ? -1 : 1;
        }
        return b.createdAt.compareTo(a.createdAt);
      });
  return ProgramLiveBoard(
    programId: programId,
    generatedAt: now,
    now:
        tonight.where((fn) => fn.phase == ProgramLivePhase.now).firstOrNull ??
        tonight.where((fn) => fn.phase == ProgramLivePhase.next).firstOrNull,
    tonight: tonight,
    expected: travel == null ? 0 : requiredInt(travel, 'expected'),
    atCurb: travel == null ? 0 : requiredInt(travel, 'atCurb'),
    disrupted: travel == null ? 0 : requiredInt(travel, 'disrupted'),
    alerts: live.take(150).toList(growable: false),
    truncated: live.length > 150,
  );
}
