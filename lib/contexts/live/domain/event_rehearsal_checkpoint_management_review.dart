part of 'event_rehearsal_movement.dart';

final class RehearsalCheckpointAssignmentReview {
  const RehearsalCheckpointAssignmentReview._(
    this.revision,
    this.sourceHash,
    this.change,
  );
  final int revision;
  final String sourceHash;
  final RehearsalCheckpointReassignment? change;
  factory RehearsalCheckpointAssignmentReview._parse(
    Object? raw,
    RehearsalMovementRecord record,
  ) {
    final m = assistanceObject(raw, {'revision', 'sourceHash', 'change'});
    final revision = assistanceInteger(m['revision']);
    if (revision != (record.assignment?.revision ?? 0) ||
        _movementHash(m['change']) !=
            _movementHash(record.assignment?.toJson())) {
      throw const FormatException(
        'Reporter review contradicts its saved change.',
      );
    }
    return RehearsalCheckpointAssignmentReview._(
      revision,
      assistanceHash(m['sourceHash']),
      record.assignment,
    );
  }
}

final class RehearsalCheckpointCloseoutReview {
  const RehearsalCheckpointCloseoutReview._(
    this.revision,
    this.sourceHash,
    this.change,
    this.state,
    this.eligibility,
  );
  final int revision;
  final String sourceHash;
  final RehearsalCheckpointCloseoutChange? change;
  final AssistanceCheckpointCloseoutState state;
  final AssistanceCheckpointCloseoutEligibility eligibility;
  factory RehearsalCheckpointCloseoutReview._parse(
    Object? raw,
    RehearsalMovementRecord record,
    AssistanceCheckpointAvailability availability,
  ) {
    final m = assistanceObject(raw, {
      'revision',
      'sourceHash',
      'change',
      'state',
      'eligibility',
    });
    final revision = assistanceInteger(m['revision']);
    if (revision != (record.closeout?.revision ?? 0) ||
        _movementHash(m['change']) !=
            _movementHash(record.closeout?.toJson())) {
      throw const FormatException(
        'Closeout review contradicts its saved change.',
      );
    }
    final expected = _managementState(record, availability);
    if (_movementHash(m['state']) != _movementHash(expected) ||
        _movementHash(m['eligibility']) !=
            _movementHash(
              _managementEligibility(
                record,
                availability,
                expected['kind'] == 'closedOut',
              ),
            )) {
      throw const FormatException(
        'Closeout review contradicts current evidence.',
      );
    }
    return RehearsalCheckpointCloseoutReview._(
      revision,
      assistanceHash(m['sourceHash']),
      record.closeout,
      AssistanceCheckpointCloseoutState.fromJson(m['state']),
      AssistanceCheckpointCloseoutEligibility.fromJson(m['eligibility']),
    );
  }
}

Map<String, Object?> _managementState(
  RehearsalMovementRecord record,
  AssistanceCheckpointAvailability availability,
) {
  final decision = record.closeout?.decision;
  final report = record.report;
  if (decision == null) return {'kind': 'open'};
  if (report != null &&
      report.accountedFor.length == record.departure.roster?.members.length) {
    return {'kind': 'superseded'};
  }
  if (decision is RehearsalCheckpointReopened) return {'kind': 'reopened'};
  final saved = decision as RehearsalCheckpointClosed;
  if (availability is! AssistanceCheckpointRoster) {
    return {'kind': 'needsReview', 'reason': 'sourceUnavailable'};
  }
  if (_movementHash(report?.toJson()) != _movementHash(saved.report.toJson())) {
    return {'kind': 'needsReview', 'reason': 'reportChanged'};
  }
  final current = _managementCurrentCloseout(record, availability);
  return current != null &&
          _movementHash(current) == _movementHash(saved.toJson())
      ? {'kind': 'closedOut'}
      : {'kind': 'needsReview', 'reason': 'dispositionChanged'};
}

Map<String, Object?>? _managementCurrentCloseout(
  RehearsalMovementRecord record,
  AssistanceCheckpointAvailability availability,
) {
  final report = record.report;
  if (availability is! AssistanceCheckpointRoster ||
      report == null ||
      report.accountedFor.length == record.departure.roster?.members.length) {
    return null;
  }
  final dispositions = <Map<String, Object?>>[];
  for (final member in availability.members) {
    if (report.accountedFor.contains(member.attendeeId)) continue;
    final proof = member.disposition;
    if (member.visit is! AssistanceCheckpointCurrentVisit ||
        proof is! AssistanceCheckpointResolvedDisposition) {
      return null;
    }
    dispositions.add({
      'attendeeId': member.attendeeId,
      ..._managementDispositionJson(proof),
    });
  }
  return {
    'kind': 'close',
    'report': report.toJson(),
    'dispositions': dispositions,
  };
}

Map<String, Object?> _managementEligibility(
  RehearsalMovementRecord record,
  AssistanceCheckpointAvailability availability,
  bool closed,
) {
  final report = record.report;
  final reason = availability is! AssistanceCheckpointRoster
      ? 'sourceUnavailable'
      : report == null
      ? 'reportMissing'
      : report.accountedFor.length == record.departure.roster?.members.length
      ? 'reportComplete'
      : closed
      ? 'alreadyClosed'
      : null;
  if (reason != null) {
    return {'kind': 'unavailable', 'reason': reason, 'attendeeIds': <String>[]};
  }
  if (_managementCurrentCloseout(record, availability) != null) {
    return {'kind': 'ready'};
  }
  final roster = availability as AssistanceCheckpointRoster;
  return {
    'kind': 'unavailable',
    'reason': 'unresolvedMembers',
    'attendeeIds': [
      for (final member in roster.members)
        if (!report!.accountedFor.contains(member.attendeeId) &&
            (member.visit is! AssistanceCheckpointCurrentVisit ||
                member.disposition is! AssistanceCheckpointResolvedDisposition))
          member.attendeeId,
    ],
  };
}

AssistanceCheckpointSupplement<T> _managementSupplement<T>(
  Map<Object?, Object?> m,
  String key,
  bool hasRequest,
  T Function(Object?) parse,
) {
  if (!m.containsKey(key)) return const AssistanceCheckpointNotProvided();
  if ((m[key] != null) != hasRequest) {
    throw const FormatException(
      'Management review requires a checkpoint request.',
    );
  }
  return AssistanceCheckpointProvided(m[key] == null ? null : parse(m[key]));
}

/// Shared eligibility for practice controls and their typed commands.
final class RehearsalCheckpointRequestPermissions {
  const RehearsalCheckpointRequestPermissions(this.snapshot);
  final RehearsalMovementReview snapshot;
  RehearsalMovementCheckpoint? get _checkpoint => snapshot.checkpoint;
  bool get _active =>
      snapshot.session.actionCount < 500 &&
      snapshot.session.runtimeRevision < 2147483647 &&
      {
        EventRehearsalStatus.running,
        EventRehearsalStatus.paused,
        EventRehearsalStatus.complete,
      }.contains(snapshot.session.status) &&
      (snapshot.staffReview?.canPerform(
            snapshot.scope.groupId,
            AssistanceGroupPermission.recordCheckpoint,
          ) ??
          true) &&
      _checkpoint?.request != null;
  bool get _manager => snapshot.staffReview?.isManager ?? true;
  bool get _responsible =>
      _manager ||
      _checkpoint?.request?.responsibleOperatorId == snapshot.actorUid;
  bool get canReassign {
    final c = _checkpoint;
    return _active &&
        _manager &&
        c!.reporterOptions.value != null &&
        c.reporterOptions.value!.actorUid == snapshot.actorUid &&
        c.reporterOptions.value!.validUntil > snapshot.serverTime &&
        c.assignment.value != null &&
        c.assignment.value!.revision < 9007199254740991 &&
        c.availability is AssistanceCheckpointRoster &&
        c.request!.state != AssistanceCheckpointRequestState.complete &&
        c.request!.state != AssistanceCheckpointRequestState.closedOut;
  }

  bool get canClose {
    final c = _checkpoint?.closeout.value;
    return _active &&
        _responsible &&
        c != null &&
        c.revision < 9007199254740991 &&
        c.eligibility is AssistanceCheckpointCloseoutReady;
  }

  bool get canReopen {
    final c = _checkpoint?.closeout.value;
    return _active &&
        _responsible &&
        c != null &&
        c.revision < 9007199254740991 &&
        c.change?.decision is RehearsalCheckpointClosed &&
        _checkpoint!.request!.state !=
            AssistanceCheckpointRequestState.complete;
  }
}
