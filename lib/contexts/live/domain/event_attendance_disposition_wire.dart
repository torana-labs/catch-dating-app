part of 'event_attendance_disposition.dart';

EventAttendanceDispositionResult _attendanceResult(
  Object? data,
  EventAssistanceGuestScope scope,
) {
  final result = _attendanceMap(data, {'outcome', 'operationRevision', 'view'});
  final outcome = _attendanceEnum(
    AttendanceDispositionOutcome.values,
    result['outcome'],
  );
  final view = _attendanceMap(result['view'], {
    'context',
    'attendeeId',
    'displayName',
    'serverTime',
    'sourceHash',
    'attendance',
    'closure',
    'declineEvidence',
    'disposition',
    'recordability',
    'canClear',
  });
  final context = _attendanceMap(view['context'], {
    'mode',
    'eventId',
    'organizerId',
  });
  if (context['mode'] != 'live' ||
      _attendanceId(context['eventId']) != scope.eventId ||
      _attendanceId(context['organizerId']) != scope.organizerId ||
      _attendanceId(view['attendeeId']) != scope.attendeeId) {
    throw const FormatException('Closeout response scope mismatch.');
  }
  final now = _attendanceInteger(view['serverTime']);
  final physical = _attendanceMap(view['attendance'], {
    'status',
    'checkedIn',
    'revision',
  });
  final attendance = (
    status: _attendanceEnum(EventAttendeeStatus.values, physical['status']),
    checkedIn: _attendanceBoolean(physical['checkedIn']),
    revision: _attendanceInteger(physical['revision']),
  );
  if (attendance.status == EventAttendeeStatus.checkedIn &&
      !attendance.checkedIn) {
    throw const FormatException('Contradictory physical attendance.');
  }
  final closure = _attendanceClosure(view['closure'], now);
  final decline = view['declineEvidence'] == null
      ? null
      : _attendanceEvidence(view['declineEvidence']);
  if (decline != null && decline is! AttendanceGuestDeclined) {
    throw const FormatException('Invalid guest decline evidence.');
  }
  final disposition = _attendanceDisposition(view['disposition'], now);
  final recordability = _attendanceRecordability(view['recordability']);
  final canClear = _attendanceBoolean(view['canClear']);
  final expectedReason = closure is AttendanceEventCancelled
      ? AttendanceRecordUnavailableReason.eventCancelled
      : attendance.checkedIn
      ? AttendanceRecordUnavailableReason.alreadyAttended
      : attendance.status != EventAttendeeStatus.registered
      ? AttendanceRecordUnavailableReason.notAdmitted
      : closure is AttendanceStillOpen
      ? AttendanceRecordUnavailableReason.eventNotFinished
      : null;
  final actualReason = switch (recordability) {
    AttendanceCanRecord() => null,
    AttendanceCannotRecord(:final reason) => reason,
  };
  if (expectedReason != actualReason) {
    throw const FormatException('Contradictory closeout availability.');
  }
  final parsed = EventAttendanceDispositionView._(
    scope: scope,
    displayName: _attendanceText(view['displayName'], 160),
    serverTime: now,
    sourceHash: _attendanceHash(view['sourceHash']),
    attendance: attendance,
    closure: closure,
    declineEvidence: decline as AttendanceGuestDeclined?,
    disposition: disposition,
    recordability: recordability,
    canClear: canClear,
  );
  final consistent = switch (disposition) {
    AttendanceUnreviewed() || AttendanceDispositionSourceChanged() => !canClear,
    AttendanceNoShowRecorded(:final evidence) =>
      canClear &&
          parsed.canRecord &&
          (evidence is AttendanceHostConfirmed ||
              _sameEvidence(evidence, decline)),
    AttendanceDecisionCleared(:final reason) =>
      !canClear && _canExplainClear(parsed, reason),
    AttendanceDecisionSuperseded() => true,
  };
  final revision = result['operationRevision'] == null
      ? null
      : _attendanceInteger(result['operationRevision'], minimum: 1);
  final outcomeValid = switch (outcome) {
    AttendanceDispositionOutcome.read => revision == null,
    AttendanceDispositionOutcome.applied =>
      revision == disposition.revision &&
          (disposition is AttendanceNoShowRecorded ||
              disposition is AttendanceDecisionCleared),
    AttendanceDispositionOutcome.replayed =>
      revision != null &&
          revision <= disposition.revision &&
          disposition is! AttendanceDispositionSourceChanged &&
          disposition is! AttendanceUnreviewed,
  };
  if (!consistent || !outcomeValid) {
    throw const FormatException('Inconsistent closeout response.');
  }
  return EventAttendanceDispositionResult._(
    outcome: outcome,
    operationRevision: revision,
    view: parsed,
  );
}

AttendanceNoShowEvidence _attendanceEvidence(Object? data) {
  final value = _attendanceObject(data);
  switch (value['kind']) {
    case 'hostConfirmed':
      _attendanceMap(data, {'kind'});
      return const AttendanceHostConfirmed();
    case 'guestDeclined':
      _attendanceMap(data, {'kind', 'guestRevision', 'episodeId'});
      return AttendanceGuestDeclined._(
        _attendanceInteger(value['guestRevision']),
        _attendanceId(value['episodeId']),
      );
    default:
      throw const FormatException('Unknown no-show evidence.');
  }
}

AttendanceClosure _attendanceClosure(Object? data, int now) {
  final value = _attendanceObject(data);
  switch (value['kind']) {
    case 'open':
      _attendanceMap(data, {'kind'});
      return const AttendanceStillOpen._();
    case 'cancelled':
      _attendanceMap(data, {'kind'});
      return const AttendanceEventCancelled._();
    case 'runtimeComplete':
      _attendanceMap(data, {'kind', 'completedAt'});
      return AttendanceRuntimeComplete._(
        _attendanceTime(value['completedAt'], now),
      );
    case 'scheduledEnd':
      _attendanceMap(data, {'kind', 'endedAt'});
      return AttendanceScheduledEnd._(_attendanceTime(value['endedAt'], now));
    default:
      throw const FormatException('Unknown attendance closure.');
  }
}

AttendanceRecordability _attendanceRecordability(Object? data) {
  final value = _attendanceObject(data);
  switch (value['kind']) {
    case 'allowed':
      _attendanceMap(data, {'kind'});
      return const AttendanceCanRecord._();
    case 'unavailable':
      _attendanceMap(data, {'kind', 'reason'});
      return AttendanceCannotRecord._(
        _attendanceEnum(
          AttendanceRecordUnavailableReason.values,
          value['reason'],
        ),
      );
    default:
      throw const FormatException('Unknown closeout availability.');
  }
}

AttendanceDisposition _attendanceDisposition(Object? data, int now) {
  final value = _attendanceObject(data);
  final revision = _attendanceInteger(value['revision']);
  if (value['kind'] != 'unreviewed' && revision == 0) {
    throw const FormatException('Missing closeout decision revision.');
  }
  switch (value['kind']) {
    case 'unreviewed':
      _attendanceMap(data, {'kind', 'revision'});
      if (revision != 0) {
        throw const FormatException('Invalid unreviewed revision.');
      }
      return const AttendanceUnreviewed._();
    case 'recorded':
      _attendanceMap(data, {
        'kind',
        'revision',
        'evidence',
        'actorUid',
        'recordedAt',
      });
      return AttendanceNoShowRecorded._(
        revision,
        _attendanceEvidence(value['evidence']),
        _attendanceId(value['actorUid']),
        _attendanceTime(value['recordedAt'], now),
      );
    case 'cleared':
      _attendanceMap(data, {
        'kind',
        'revision',
        'reason',
        'actorUid',
        'recordedAt',
      });
      return AttendanceDecisionCleared._(
        revision,
        _attendanceEnum(AttendanceClearReason.values, value['reason']),
        _attendanceId(value['actorUid']),
        _attendanceTime(value['recordedAt'], now),
      );
    case 'sourceChanged':
      _attendanceMap(data, {'kind', 'revision'});
      return AttendanceDispositionSourceChanged._(revision);
    case 'superseded':
      _attendanceMap(data, {'kind', 'revision', 'reason'});
      return AttendanceDecisionSuperseded._(
        revision,
        _attendanceEnum(AttendanceSupersededReason.values, value['reason']),
      );
    default:
      throw const FormatException('Unknown attendance disposition.');
  }
}

bool _sameEvidence(AttendanceNoShowEvidence? a, AttendanceNoShowEvidence? b) =>
    switch ((a, b)) {
      (AttendanceHostConfirmed(), AttendanceHostConfirmed()) => true,
      (
        AttendanceGuestDeclined(guestRevision: final ar, episodeId: final ae),
        AttendanceGuestDeclined(guestRevision: final br, episodeId: final be),
      ) =>
        ar == br && ae == be,
      _ => false,
    };

bool _canExplainClear(
  EventAttendanceDispositionView view,
  AttendanceClearReason reason,
) => switch (reason) {
  AttendanceClearReason.recordingMistake => true,
  AttendanceClearReason.attendanceCorrected => view.attendance.checkedIn,
  AttendanceClearReason.noLongerApplicable =>
    view.closure is AttendanceEventCancelled ||
        !{
          EventAttendeeStatus.registered,
          EventAttendeeStatus.checkedIn,
        }.contains(view.attendance.status),
};

Map<Object?, Object?> _attendanceObject(Object? data) {
  if (data is Map<Object?, Object?>) return data;
  throw const FormatException('Invalid closeout object.');
}

Map<Object?, Object?> _attendanceMap(Object? data, Set<String> keys) {
  final value = _attendanceObject(data);
  if (value.length == keys.length && keys.every(value.containsKey)) {
    return value;
  }
  throw const FormatException('Invalid closeout fields.');
}

String _attendanceText(Object? data, int maximum) {
  if (data is String && data.isNotEmpty && data.length <= maximum) return data;
  throw const FormatException('Invalid closeout text.');
}

String _attendanceId(Object? data) {
  final value = _attendanceText(data, 160);
  if (RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]*$').hasMatch(value)) return value;
  throw const FormatException('Invalid closeout identity.');
}

String _attendanceHash(Object? data) {
  if (data is String && RegExp(r'^[a-f0-9]{64}$').hasMatch(data)) return data;
  throw const FormatException('Invalid closeout source hash.');
}

int _attendanceInteger(Object? data, {int minimum = 0}) {
  if (data is num &&
      data.isFinite &&
      data >= minimum &&
      data <= 9007199254740991 &&
      data == data.truncateToDouble()) {
    return data.toInt();
  }
  throw const FormatException('Invalid closeout revision or time.');
}

int _attendanceTime(Object? data, int now) {
  final value = _attendanceInteger(data);
  if (value <= now) return value;
  throw const FormatException('Closeout evidence is in the future.');
}

bool _attendanceBoolean(Object? data) {
  if (data is bool) return data;
  throw const FormatException('Invalid closeout flag.');
}

T _attendanceEnum<T extends Enum>(List<T> choices, Object? value) {
  for (final choice in choices) {
    if (choice.name == value) return choice;
  }
  throw const FormatException('Unknown closeout value.');
}
