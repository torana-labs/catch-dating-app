part of 'event_attendance_report.dart';

EventAttendanceReportView _attendanceReport(
  Object? data,
  EventAssistanceRuntimeScope scope,
) {
  final envelope = assistanceObject(data, {'view'});
  final view = assistanceObject(envelope['view'], {
    'context',
    'serverTime',
    'sourceHash',
    'closure',
    'source',
    'coverage',
    'rosterCount',
    'counts',
    'members',
  });
  scope.requireMatch(view['context']);
  if (view['source'] != 'eventAttendees') {
    throw const FormatException('Unknown attendance report source.');
  }
  final now = assistanceInteger(view['serverTime']);
  final closure = AttendanceClosure.fromJson(view['closure'], serverTime: now);
  final coverage = assistanceEnum(
    AttendanceReportCoverage.values,
    view['coverage'],
  );
  final rosterCount = _reportCount(view['rosterCount']);
  final rawMembers = view['members'];
  if (rawMembers is! List<Object?> ||
      rawMembers.length != rosterCount ||
      (rosterCount == 0) !=
          (coverage == AttendanceReportCoverage.emptyRoster)) {
    throw const FormatException('Incomplete attendance report roster.');
  }
  final ids = <String>{};
  final members = <EventAttendanceReportMember>[];
  for (final raw in rawMembers) {
    final member = assistanceObject(raw, {'attendeeId', 'classification'});
    final attendeeId = assistanceId(member['attendeeId']);
    if (!ids.add(attendeeId)) {
      throw const FormatException('Duplicate attendance report guest.');
    }
    final classification = _reportClassification(member['classification']);
    final compatible = switch ((closure, classification)) {
      (AttendanceStillOpen(), AttendanceReportRecordedNoShow()) => false,
      (
        AttendanceEventCancelled(),
        AttendanceReportRecordedNoShow() || AttendanceReportUnresolved(),
      ) =>
        false,
      (
        AttendanceEventCancelled(),
        AttendanceReportNotExpected(
          reason: AttendanceReportNotExpectedReason.eventCancelled,
        ),
      ) =>
        true,
      (
        _,
        AttendanceReportNotExpected(
          reason: AttendanceReportNotExpectedReason.eventCancelled,
        ),
      ) =>
        false,
      _ => true,
    };
    if (!compatible) {
      throw const FormatException('Contradictory attendance report closure.');
    }
    members.add(
      EventAttendanceReportMember._(
        EventAssistanceGuestScope(
          organizerId: scope.organizerId,
          eventId: scope.eventId,
          attendeeId: attendeeId,
        ),
        classification,
      ),
    );
  }
  final counts = _reportCounts(view['counts']);
  _requireMemberCounts(counts, members);
  return EventAttendanceReportView._(
    scope: scope,
    serverTime: now,
    sourceHash: assistanceHash(view['sourceHash']),
    closure: closure,
    coverage: coverage,
    rosterCount: rosterCount,
    counts: counts,
    members: List.unmodifiable(members),
  );
}

AttendanceReportClassification _reportClassification(Object? data) {
  final map = assistanceObject(data);
  switch (map['kind']) {
    case 'attended':
      assistanceObject(data, {'kind'});
      return const AttendanceReportAttended._();
    case 'recordedNoShow':
      assistanceObject(data, {'kind', 'evidence'});
      return AttendanceReportRecordedNoShow._(
        assistanceEnum(AttendanceReportEvidence.values, map['evidence']),
      );
    case 'unresolved':
      assistanceObject(data, {'kind', 'reason'});
      return AttendanceReportUnresolved._(
        assistanceEnum(AttendanceReportUnresolvedReason.values, map['reason']),
      );
    case 'notExpected':
      assistanceObject(data, {'kind', 'reason'});
      return AttendanceReportNotExpected._(
        assistanceEnum(AttendanceReportNotExpectedReason.values, map['reason']),
      );
    default:
      throw const FormatException('Unknown attendance report classification.');
  }
}

int _reportCount(Object? value) {
  final count = assistanceInteger(value);
  if (count > 1000) {
    throw const FormatException('Attendance report exceeds its roster limit.');
  }
  return count;
}

AttendanceReportCounts _reportCounts(Object? data) {
  final counts = assistanceObject(data, {
    'attended',
    'recordedNoShow',
    'unresolved',
    'notExpected',
  });
  final recorded = assistanceObject(counts['recordedNoShow'], {
    'hostConfirmed',
    'guestDeclined',
  });
  final unresolved = assistanceObject(counts['unresolved'], {
    'unreviewed',
    'cleared',
    'sourceChanged',
    'superseded',
  });
  final notExpected = assistanceObject(counts['notExpected'], {
    'invited',
    'waitlisted',
    'cancelled',
    'eventCancelled',
  });
  return AttendanceReportCounts._(
    attended: _reportCount(counts['attended']),
    recordedNoShow: (
      hostConfirmed: _reportCount(recorded['hostConfirmed']),
      guestDeclined: _reportCount(recorded['guestDeclined']),
    ),
    unresolved: (
      unreviewed: _reportCount(unresolved['unreviewed']),
      cleared: _reportCount(unresolved['cleared']),
      sourceChanged: _reportCount(unresolved['sourceChanged']),
      superseded: _reportCount(unresolved['superseded']),
    ),
    notExpected: (
      invited: _reportCount(notExpected['invited']),
      waitlisted: _reportCount(notExpected['waitlisted']),
      cancelled: _reportCount(notExpected['cancelled']),
      eventCancelled: _reportCount(notExpected['eventCancelled']),
    ),
  );
}

void _requireMemberCounts(
  AttendanceReportCounts counts,
  List<EventAttendanceReportMember> members,
) {
  var attended = 0;
  final recorded = {
    for (final kind in AttendanceReportEvidence.values) kind: 0,
  };
  final unresolved = {
    for (final reason in AttendanceReportUnresolvedReason.values) reason: 0,
  };
  final notExpected = {
    for (final reason in AttendanceReportNotExpectedReason.values) reason: 0,
  };
  int add(AttendanceReportClassification classification) =>
      switch (classification) {
        AttendanceReportAttended() => attended++,
        AttendanceReportRecordedNoShow(:final evidence) => recorded.update(
          evidence,
          (count) => count + 1,
        ),
        AttendanceReportUnresolved(:final reason) => unresolved.update(
          reason,
          (count) => count + 1,
        ),
        AttendanceReportNotExpected(:final reason) => notExpected.update(
          reason,
          (count) => count + 1,
        ),
      };
  for (final member in members) {
    add(member.classification);
  }
  if (counts.total != members.length ||
      counts.attended != attended ||
      counts.recordedNoShow !=
          (
            hostConfirmed: recorded[AttendanceReportEvidence.hostConfirmed],
            guestDeclined: recorded[AttendanceReportEvidence.guestDeclined],
          ) ||
      counts.unresolved !=
          (
            unreviewed: unresolved[AttendanceReportUnresolvedReason.unreviewed],
            cleared: unresolved[AttendanceReportUnresolvedReason.cleared],
            sourceChanged:
                unresolved[AttendanceReportUnresolvedReason.sourceChanged],
            superseded: unresolved[AttendanceReportUnresolvedReason.superseded],
          ) ||
      counts.notExpected !=
          (
            invited: notExpected[AttendanceReportNotExpectedReason.invited],
            waitlisted:
                notExpected[AttendanceReportNotExpectedReason.waitlisted],
            cancelled: notExpected[AttendanceReportNotExpectedReason.cancelled],
            eventCancelled:
                notExpected[AttendanceReportNotExpectedReason.eventCancelled],
          )) {
    throw const FormatException(
      'Attendance report totals do not match its roster.',
    );
  }
}
