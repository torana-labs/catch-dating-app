part of 'event_assistance_checkpoint.dart';

/// Missing legacy projections are distinct from a current, explicit null.
sealed class AssistanceCheckpointSupplement<T> {
  const AssistanceCheckpointSupplement();
  bool get isProvided;
  T? get value;
}

final class AssistanceCheckpointNotProvided<T>
    extends AssistanceCheckpointSupplement<T> {
  const AssistanceCheckpointNotProvided();
  @override
  bool get isProvided => false;
  @override
  T? get value => null;
}

final class AssistanceCheckpointProvided<T>
    extends AssistanceCheckpointSupplement<T> {
  const AssistanceCheckpointProvided(this.value);
  @override
  bool get isProvided => true;
  @override
  final T? value;
}

AssistanceCheckpointSupplement<T> _checkpointSupplement<T>(
  Map<Object?, Object?> map,
  String key,
  T Function(Object?) parse,
) => map.containsKey(key)
    ? AssistanceCheckpointProvided(map[key] == null ? null : parse(map[key]))
    : const AssistanceCheckpointNotProvided();

enum AssistanceCheckpointDispositionUnavailableReason {
  registrationMissing,
  visitChanged,
  notCheckedIn,
  invalidSource,
  beforeDeparture,
}

sealed class AssistanceCheckpointDisposition {
  const AssistanceCheckpointDisposition();
  factory AssistanceCheckpointDisposition.fromJson(
    Object? raw, {
    required int now,
  }) => AssistanceCheckpointDisposition._parse(raw, now);
  factory AssistanceCheckpointDisposition._parse(Object? raw, int now) {
    final map = assistanceObject(raw);
    switch (map['kind']) {
      case 'unresolved':
        assistanceObject(map, {'kind'});
        return const AssistanceCheckpointDispositionUnresolved();
      case 'unavailable':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceCheckpointDispositionUnavailable(
          assistanceEnum(
            AssistanceCheckpointDispositionUnavailableReason.values,
            map['reason'],
          ),
        );
      case 'resolved':
        assistanceObject(map, {
          'kind',
          'disposition',
          'revision',
          'resolvedAt',
          'resolvedBy',
          'sourceHash',
        });
        final disposition = assistanceEnum(
          AssistanceVisitDisposition.values,
          map['disposition'],
        );
        final at = assistanceInteger(map['resolvedAt']);
        if (disposition == AssistanceVisitDisposition.unresolved || at > now) {
          throw const FormatException(
            'Invalid resolved checkpoint disposition.',
          );
        }
        return AssistanceCheckpointResolvedDisposition._(
          disposition,
          _checkpointPositive(map['revision']),
          at,
          assistanceText(map['resolvedBy']),
          assistanceHash(map['sourceHash']),
        );
      default:
        throw const FormatException('Unknown checkpoint disposition evidence.');
    }
  }
}

final class AssistanceCheckpointDispositionNotProvided
    extends AssistanceCheckpointDisposition {
  const AssistanceCheckpointDispositionNotProvided();
}

final class AssistanceCheckpointDispositionUnresolved
    extends AssistanceCheckpointDisposition {
  const AssistanceCheckpointDispositionUnresolved();
}

final class AssistanceCheckpointDispositionUnavailable
    extends AssistanceCheckpointDisposition {
  const AssistanceCheckpointDispositionUnavailable(this.reason);
  final AssistanceCheckpointDispositionUnavailableReason reason;
}

final class AssistanceCheckpointResolvedDisposition
    extends AssistanceCheckpointDisposition {
  const AssistanceCheckpointResolvedDisposition._(
    this.disposition,
    this.revision,
    this.resolvedAt,
    this.resolvedBy,
    this.sourceHash,
  );
  final AssistanceVisitDisposition disposition;
  final int revision, resolvedAt;
  final String resolvedBy, sourceHash;
}

enum AssistanceCheckpointRequestState {
  awaitingReport,
  overdue,
  discrepancy,
  complete,
  closedOut,
  sourceUnavailable,
}

enum AssistanceCheckpointOwnerAvailability {
  current,
  needsReassignment,
  notRequired,
}

final class AssistanceCheckpointRequest {
  const AssistanceCheckpointRequest._(
    this.responsibleOperatorId,
    this.dueAt,
    this.state,
    this.ownerAvailability,
  );
  final String responsibleOperatorId;
  final int dueAt;
  final AssistanceCheckpointRequestState state;
  final AssistanceCheckpointOwnerAvailability ownerAvailability;
  factory AssistanceCheckpointRequest.fromJson(Object? raw) =>
      AssistanceCheckpointRequest._parse(raw);
  factory AssistanceCheckpointRequest._parse(Object? raw) {
    final map = assistanceObject(raw, {
      'responsibleOperatorId',
      'dueAt',
      'state',
      'ownerAvailability',
    });
    final state = assistanceEnum(
      AssistanceCheckpointRequestState.values,
      map['state'],
    );
    final owner = assistanceEnum(
      AssistanceCheckpointOwnerAvailability.values,
      map['ownerAvailability'],
    );
    if ((state == AssistanceCheckpointRequestState.complete ||
            state == AssistanceCheckpointRequestState.closedOut) !=
        (owner == AssistanceCheckpointOwnerAvailability.notRequired)) {
      throw const FormatException(
        'Checkpoint request ownership is inconsistent.',
      );
    }
    return AssistanceCheckpointRequest._(
      _checkpointOperator(map['responsibleOperatorId']),
      assistanceInteger(map['dueAt']),
      state,
      owner,
    );
  }
}

void _checkpointRequireRequest(
  AssistanceCheckpointRequest request,
  AssistanceCheckpointAvailability availability,
  AssistanceCheckpointReport? report,
  int now,
) {
  final valid = switch (request.state) {
    AssistanceCheckpointRequestState.awaitingReport =>
      availability is AssistanceCheckpointRoster &&
          report == null &&
          now < request.dueAt,
    AssistanceCheckpointRequestState.overdue =>
      availability is AssistanceCheckpointRoster &&
          report == null &&
          now >= request.dueAt,
    AssistanceCheckpointRequestState.discrepancy ||
    AssistanceCheckpointRequestState.closedOut =>
      availability is AssistanceCheckpointRoster &&
          availability.status == AssistanceCheckpointReportStatus.partial,
    AssistanceCheckpointRequestState.sourceUnavailable =>
      availability is AssistanceCheckpointUnavailable,
    AssistanceCheckpointRequestState.complete =>
      report != null &&
          (availability is! AssistanceCheckpointRoster ||
              availability.status == AssistanceCheckpointReportStatus.complete),
  };
  if (!valid) {
    throw const FormatException(
      'Checkpoint request and observation state disagree.',
    );
  }
}

final class AssistanceCheckpointReassignment {
  const AssistanceCheckpointReassignment._(
    this.revision,
    this.receiptId,
    this.responsibleOperatorId,
    this.previousResponsibleOperatorId,
    this.assignedBy,
    this.assignedAt,
    this.reason,
  );
  final int revision, assignedAt;
  final String receiptId,
      responsibleOperatorId,
      previousResponsibleOperatorId,
      assignedBy,
      reason;
  factory AssistanceCheckpointReassignment._parse(Object? raw, int now) {
    final map = assistanceObject(raw, {
      'revision',
      'receiptId',
      'responsibleOperatorId',
      'previousResponsibleOperatorId',
      'assignedBy',
      'assignedAt',
      'reason',
    });
    final at = assistanceInteger(map['assignedAt']);
    final owner = _checkpointOperator(map['responsibleOperatorId']);
    final previous = _checkpointOperator(map['previousResponsibleOperatorId']);
    if (at > now || owner == previous) {
      throw const FormatException('Invalid checkpoint reporter change.');
    }
    return AssistanceCheckpointReassignment._(
      _checkpointPositive(map['revision']),
      _checkpointHashId(map['receiptId'], 'checkpoint-reassignment'),
      owner,
      previous,
      _checkpointOperator(map['assignedBy']),
      at,
      _checkpointReason(map['reason']),
    );
  }
}

final class AssistanceCheckpointAssignment {
  const AssistanceCheckpointAssignment._(
    this.revision,
    this.sourceHash,
    this.change,
  );
  final int revision;
  final String sourceHash;
  final AssistanceCheckpointReassignment? change;
  factory AssistanceCheckpointAssignment._parse(Object? raw, int now) {
    final map = assistanceObject(raw, {'revision', 'sourceHash', 'change'});
    final revision = assistanceInteger(map['revision']);
    final change = map['change'] == null
        ? null
        : AssistanceCheckpointReassignment._parse(map['change'], now);
    if (revision != (change?.revision ?? 0)) {
      throw const FormatException('Checkpoint assignment revision mismatch.');
    }
    return AssistanceCheckpointAssignment._(
      revision,
      assistanceHash(map['sourceHash']),
      change,
    );
  }
}

enum AssistanceCheckpointCloseoutKind {
  open,
  reopened,
  closedOut,
  superseded,
  needsReview,
}

enum AssistanceCheckpointCloseoutReviewReason {
  sourceUnavailable,
  reportChanged,
  dispositionChanged,
}

final class AssistanceCheckpointCloseoutState {
  const AssistanceCheckpointCloseoutState._(this.kind, this.reason);
  final AssistanceCheckpointCloseoutKind kind;
  final AssistanceCheckpointCloseoutReviewReason? reason;
  factory AssistanceCheckpointCloseoutState.fromJson(Object? raw) =>
      AssistanceCheckpointCloseoutState._parse(raw);
  factory AssistanceCheckpointCloseoutState._parse(Object? raw) {
    final map = assistanceObject(raw);
    final kind = assistanceEnum(
      AssistanceCheckpointCloseoutKind.values,
      map['kind'],
    );
    assistanceObject(map, {
      'kind',
      if (kind == AssistanceCheckpointCloseoutKind.needsReview) 'reason',
    });
    return AssistanceCheckpointCloseoutState._(
      kind,
      kind == AssistanceCheckpointCloseoutKind.needsReview
          ? assistanceEnum(
              AssistanceCheckpointCloseoutReviewReason.values,
              map['reason'],
            )
          : null,
    );
  }
}

enum AssistanceCheckpointCloseoutUnavailableReason {
  sourceUnavailable,
  reportMissing,
  reportComplete,
  unresolvedMembers,
  alreadyClosed,
}

sealed class AssistanceCheckpointCloseoutEligibility {
  const AssistanceCheckpointCloseoutEligibility();
  factory AssistanceCheckpointCloseoutEligibility.fromJson(Object? raw) {
    final rawEligibility = assistanceObject(raw);
    final AssistanceCheckpointCloseoutEligibility eligibility;
    switch (rawEligibility['kind']) {
      case 'ready':
        assistanceObject(rawEligibility, {'kind'});
        eligibility = const AssistanceCheckpointCloseoutReady();
      case 'unavailable':
        assistanceObject(rawEligibility, {'kind', 'reason', 'attendeeIds'});
        final reason = assistanceEnum(
          AssistanceCheckpointCloseoutUnavailableReason.values,
          rawEligibility['reason'],
        );
        final ids = _checkpointIds(rawEligibility['attendeeIds']);
        if ((reason ==
                AssistanceCheckpointCloseoutUnavailableReason
                    .unresolvedMembers) !=
            ids.isNotEmpty) {
          throw const FormatException('Invalid unresolved closeout members.');
        }
        eligibility = AssistanceCheckpointCloseoutUnavailable._(reason, ids);
      default:
        throw const FormatException('Unknown closeout eligibility.');
    }
    return eligibility;
  }
}

/// Eligibility describes the evidence; it does not grant manager permission.
final class AssistanceCheckpointCloseoutReady
    extends AssistanceCheckpointCloseoutEligibility {
  const AssistanceCheckpointCloseoutReady();
}

final class AssistanceCheckpointCloseoutUnavailable
    extends AssistanceCheckpointCloseoutEligibility {
  const AssistanceCheckpointCloseoutUnavailable._(
    this.reason,
    this.attendeeIds,
  );
  final AssistanceCheckpointCloseoutUnavailableReason reason;
  final List<String> attendeeIds;
}

sealed class AssistanceCheckpointCloseoutDecision {
  const AssistanceCheckpointCloseoutDecision();
}

final class AssistanceCheckpointReopened
    extends AssistanceCheckpointCloseoutDecision {
  const AssistanceCheckpointReopened();
}

final class AssistanceCheckpointClosed
    extends AssistanceCheckpointCloseoutDecision {
  const AssistanceCheckpointClosed._(this.report, this.dispositions);
  final AssistanceCheckpointReport report;
  final Map<String, AssistanceCheckpointResolvedDisposition> dispositions;
}

final class AssistanceCheckpointCloseoutChange {
  const AssistanceCheckpointCloseoutChange._(
    this.revision,
    this.previousRevision,
    this.receiptId,
    this.changedBy,
    this.changedAt,
    this.reason,
    this.decision,
  );
  final int revision, previousRevision, changedAt;
  final String receiptId, changedBy, reason;
  final AssistanceCheckpointCloseoutDecision decision;
  factory AssistanceCheckpointCloseoutChange._parse(
    Object? raw,
    EventAssistanceCheckpointScope scope,
    int now,
  ) {
    final map = assistanceObject(raw, {
      'revision',
      'previousRevision',
      'receiptId',
      'changedBy',
      'changedAt',
      'reason',
      'decision',
    });
    final revision = _checkpointPositive(map['revision']);
    final previous = assistanceInteger(map['previousRevision']);
    final at = assistanceInteger(map['changedAt']);
    if (revision != previous + 1 || at > now) {
      throw const FormatException('Invalid checkpoint closeout revision.');
    }
    final rawDecision = assistanceObject(map['decision']);
    final AssistanceCheckpointCloseoutDecision decision;
    switch (rawDecision['kind']) {
      case 'reopen':
        assistanceObject(rawDecision, {'kind'});
        if (previous == 0) {
          throw const FormatException(
            'An unclosed request cannot be reopened.',
          );
        }
        decision = const AssistanceCheckpointReopened();
      case 'close':
        assistanceObject(rawDecision, {'kind', 'report', 'dispositions'});
        final report = AssistanceCheckpointReport._parse(
          rawDecision['report'],
          scope,
          at,
        );
        final rows = _checkpointList(rawDecision['dispositions']);
        if (rows.isEmpty) {
          throw const FormatException(
            'A closeout must explain the unobserved members.',
          );
        }
        final dispositions =
            <String, AssistanceCheckpointResolvedDisposition>{};
        for (final rawRow in rows) {
          final row = assistanceObject(rawRow, {
            'attendeeId',
            'kind',
            'disposition',
            'revision',
            'resolvedAt',
            'resolvedBy',
            'sourceHash',
          });
          final id = assistanceId(row['attendeeId']);
          final evidence = AssistanceCheckpointDisposition._parse({
            for (final entry in row.entries)
              if (entry.key != 'attendeeId') entry.key: entry.value,
          }, at);
          if (evidence is! AssistanceCheckpointResolvedDisposition ||
              report.accountedFor.contains(id) ||
              dispositions.containsKey(id)) {
            throw const FormatException('Invalid closeout member evidence.');
          }
          _checkpointOperator(evidence.resolvedBy);
          dispositions[id] = evidence;
        }
        _checkpointIds(dispositions.keys.toList());
        decision = AssistanceCheckpointClosed._(
          report,
          Map.unmodifiable(dispositions),
        );
      default:
        throw const FormatException('Unknown checkpoint closeout decision.');
    }
    return AssistanceCheckpointCloseoutChange._(
      revision,
      previous,
      _checkpointHashId(map['receiptId'], 'checkpoint-closeout'),
      _checkpointOperator(map['changedBy']),
      at,
      _checkpointReason(map['reason']),
      decision,
    );
  }
}

final class AssistanceCheckpointCloseout {
  const AssistanceCheckpointCloseout._(
    this.revision,
    this.sourceHash,
    this.change,
    this.state,
    this.eligibility,
  );
  final int revision;
  final String sourceHash;
  final AssistanceCheckpointCloseoutChange? change;
  final AssistanceCheckpointCloseoutState state;
  final AssistanceCheckpointCloseoutEligibility eligibility;
  factory AssistanceCheckpointCloseout._parse(
    Object? raw,
    EventAssistanceCheckpointScope scope,
    int now,
  ) {
    final map = assistanceObject(raw, {
      'revision',
      'sourceHash',
      'change',
      'state',
      'eligibility',
    });
    final revision = assistanceInteger(map['revision']);
    final change = map['change'] == null
        ? null
        : AssistanceCheckpointCloseoutChange._parse(map['change'], scope, now);
    final state = AssistanceCheckpointCloseoutState._parse(map['state']);
    if (revision != (change?.revision ?? 0) ||
        (state.kind == AssistanceCheckpointCloseoutKind.open) !=
            (change == null) ||
        state.kind == AssistanceCheckpointCloseoutKind.reopened &&
            change?.decision is! AssistanceCheckpointReopened ||
        (state.kind == AssistanceCheckpointCloseoutKind.closedOut ||
                state.kind == AssistanceCheckpointCloseoutKind.needsReview) &&
            change?.decision is! AssistanceCheckpointClosed) {
      throw const FormatException(
        'Checkpoint closeout state contradicts its saved change.',
      );
    }
    final eligibility = AssistanceCheckpointCloseoutEligibility.fromJson(
      map['eligibility'],
    );
    return AssistanceCheckpointCloseout._(
      revision,
      assistanceHash(map['sourceHash']),
      change,
      state,
      eligibility,
    );
  }
}

void _checkpointRequireCloseout(
  AssistanceCheckpointCloseout closeout,
  AssistanceCheckpointAvailability availability,
  AssistanceCheckpointReport? report,
  AssistanceCheckpointRequest request,
) {
  if ((request.state == AssistanceCheckpointRequestState.closedOut) !=
      (closeout.state.kind == AssistanceCheckpointCloseoutKind.closedOut)) {
    throw const FormatException('Checkpoint request and closeout disagree.');
  }
  if (closeout.change?.decision case AssistanceCheckpointClosed(
    report: final historical,
    :final dispositions,
  )) {
    if (report == null ||
        historical.reportId != report.reportId ||
        historical.rosterId != report.rosterId ||
        historical.rosterHash != report.rosterHash ||
        historical.createdAt != report.createdAt ||
        historical.revision > report.revision) {
      throw const FormatException(
        'Closeout evidence belongs to another checkpoint report.',
      );
    }
    if (availability case AssistanceCheckpointRoster(:final members)) {
      final covered = [...historical.accountedFor, ...dispositions.keys]
        ..sort();
      if (!_checkpointSameIds(
        covered,
        members.map((m) => m.attendeeId).toList(),
      )) {
        throw const FormatException(
          'Closeout evidence does not cover the departure roster.',
        );
      }
    }
  }
}
