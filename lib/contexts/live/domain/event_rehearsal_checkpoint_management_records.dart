part of 'event_rehearsal_movement.dart';

final class RehearsalCheckpointReassignment {
  const RehearsalCheckpointReassignment._(
    this.revision,
    this.operationId,
    this.responsibleOperatorId,
    this.previousResponsibleOperatorId,
    this.assignedBy,
    this.assignedAt,
    this.reason,
  );
  final int revision, assignedAt;
  final String operationId,
      responsibleOperatorId,
      previousResponsibleOperatorId,
      assignedBy,
      reason;
  factory RehearsalCheckpointReassignment._parse(
    Object? raw,
    RehearsalDeparture departure,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw, {
      'revision',
      'operationId',
      'responsibleOperatorId',
      'previousResponsibleOperatorId',
      'assignedBy',
      'assignedAt',
      'reason',
    });
    final revision = _managementRevision(m['revision']);
    final at = _movementTime(m['assignedAt'], session);
    final owner = _managementOperator(m['responsibleOperatorId']);
    final previous = _managementOperator(m['previousResponsibleOperatorId']);
    final operation = _movementId(m['operationId']);
    if (departure.checkpointRequest == null ||
        at < departure.confirmedAt ||
        owner == previous ||
        operation == departure.operationId ||
        revision == 1 &&
            previous != departure.checkpointRequest!.responsibleOperatorId) {
      throw const FormatException('Reporter change contradicts its departure.');
    }
    return RehearsalCheckpointReassignment._(
      revision,
      operation,
      owner,
      previous,
      _managementOperator(m['assignedBy']),
      at,
      _managementReason(m['reason']),
    );
  }
  Map<String, Object?> toJson() => {
    'revision': revision,
    'operationId': operationId,
    'responsibleOperatorId': responsibleOperatorId,
    'previousResponsibleOperatorId': previousResponsibleOperatorId,
    'assignedBy': assignedBy,
    'assignedAt': assignedAt,
    'reason': reason,
  };
}

sealed class RehearsalCheckpointCloseoutDecision {
  const RehearsalCheckpointCloseoutDecision();
  Map<String, Object?> toJson();
}

final class RehearsalCheckpointReopened
    extends RehearsalCheckpointCloseoutDecision {
  const RehearsalCheckpointReopened();
  @override
  Map<String, Object?> toJson() => {'kind': 'reopen'};
}

final class RehearsalCheckpointClosed
    extends RehearsalCheckpointCloseoutDecision {
  const RehearsalCheckpointClosed._(this.report, this.dispositions);
  final RehearsalCheckpointReport report;
  final Map<String, AssistanceCheckpointResolvedDisposition> dispositions;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'close',
    'report': report.toJson(),
    'dispositions': [
      for (final entry in dispositions.entries)
        {'attendeeId': entry.key, ..._managementDispositionJson(entry.value)},
    ],
  };
}

final class RehearsalCheckpointCloseoutChange {
  const RehearsalCheckpointCloseoutChange._(
    this.revision,
    this.previousRevision,
    this.operationId,
    this.changedBy,
    this.changedAt,
    this.reason,
    this.decision,
  );
  final int revision, previousRevision, changedAt;
  final String operationId, changedBy, reason;
  final RehearsalCheckpointCloseoutDecision decision;
  factory RehearsalCheckpointCloseoutChange._parse(
    Object? raw,
    RehearsalDeparture departure,
    RehearsalCheckpointReport? report,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw, {
      'revision',
      'previousRevision',
      'operationId',
      'changedBy',
      'changedAt',
      'reason',
      'decision',
    });
    final revision = _managementRevision(m['revision']);
    final previous = assistanceInteger(m['previousRevision']);
    final at = _movementTime(m['changedAt'], session);
    final operation = _movementId(m['operationId']);
    if (departure.checkpointRequest == null ||
        at < departure.confirmedAt ||
        previous != revision - 1 ||
        operation == departure.operationId) {
      throw const FormatException('Invalid checkpoint closeout change.');
    }
    final d = assistanceObject(m['decision']);
    final RehearsalCheckpointCloseoutDecision decision;
    switch (d['kind']) {
      case 'reopen':
        assistanceObject(d, {'kind'});
        if (previous == 0) {
          throw const FormatException('No closeout to reopen.');
        }
        decision = const RehearsalCheckpointReopened();
      case 'close':
        assistanceObject(d, {'kind', 'report', 'dispositions'});
        final saved = RehearsalCheckpointReport._parse(
          d['report'],
          departure,
          session,
        );
        final dispositions =
            <String, AssistanceCheckpointResolvedDisposition>{};
        for (final rawRow in _movementList(d['dispositions'], 50)) {
          final row = assistanceObject(rawRow);
          final id = _movementId(row['attendeeId']);
          final proof = AssistanceCheckpointDisposition.fromJson({
            for (final entry in row.entries)
              if (entry.key != 'attendeeId') entry.key: entry.value,
          }, now: at);
          if (proof is! AssistanceCheckpointResolvedDisposition ||
              proof.resolvedAt < departure.confirmedAt ||
              dispositions.containsKey(id)) {
            throw const FormatException('Invalid checkpoint closeout proof.');
          }
          _managementOperator(proof.resolvedBy);
          dispositions[id] = proof;
        }
        _movementCanonicalIds(dispositions.keys.toList());
        final ids = [...saved.accountedFor, ...dispositions.keys]..sort();
        if (dispositions.isEmpty ||
            report == null ||
            saved.revision > report.revision ||
            saved.reportedAt > at ||
            _movementHash(ids) !=
                _movementHash(
                  departure.roster!.members.map((m) => m.attendeeId).toList(),
                )) {
          throw const FormatException(
            'Closeout must cover the original roster.',
          );
        }
        decision = RehearsalCheckpointClosed._(
          saved,
          Map.unmodifiable(dispositions),
        );
      default:
        throw const FormatException('Unknown checkpoint closeout decision.');
    }
    return RehearsalCheckpointCloseoutChange._(
      revision,
      previous,
      operation,
      _managementOperator(m['changedBy']),
      at,
      _managementReason(m['reason']),
      decision,
    );
  }
  Map<String, Object?> toJson() => {
    'revision': revision,
    'previousRevision': previousRevision,
    'operationId': operationId,
    'changedBy': changedBy,
    'changedAt': changedAt,
    'reason': reason,
    'decision': decision.toJson(),
  };
}

int _managementRevision(Object? raw) {
  final value = assistanceInteger(raw);
  if (value == 0) throw const FormatException('Invalid management revision.');
  return value;
}

String _managementOperator(Object? raw) {
  final value = assistanceText(raw, 128);
  if (value.contains('/')) {
    throw const FormatException('Invalid Host identity.');
  }
  return value;
}

String _managementReason(Object? raw) {
  final value = assistanceText(raw, 500);
  if (value.trim().isEmpty || value.trim() != value) {
    throw const FormatException('Invalid checkpoint management reason.');
  }
  return value;
}

Map<String, Object?> _managementDispositionJson(
  AssistanceCheckpointResolvedDisposition d,
) => {
  'kind': 'resolved',
  'disposition': d.disposition.name,
  'revision': d.revision,
  'resolvedAt': d.resolvedAt,
  'resolvedBy': d.resolvedBy,
  'sourceHash': d.sourceHash,
};
