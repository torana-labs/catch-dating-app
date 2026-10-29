enum RehearsalRuntimeField {
  displayName,
  gender,
  interestedInGenders,
  relationshipGoal,
  dateOfBirth,
  paceBand,
  skillBand,
  dietaryAndSeatingNotes,
  questionnaireAnswerIds,
  teamName,
}

enum RehearsalRequiredDataStatus { pending, completed, expired }

final class RehearsalRequiredDataRequest {
  const RehearsalRequiredDataRequest({
    required this.revision,
    required this.fields,
    required this.completedFields,
    required this.status,
    required this.requestedAt,
    required this.expiresAt,
    required this.completedAt,
  });

  factory RehearsalRequiredDataRequest.fromJson(Object? value) {
    final map = _map(value, 'required data request');
    _keys(map, const {
      'revision',
      'fieldIds',
      'completedFieldIds',
      'status',
      'requestedAt',
      'expiresAt',
      'completedAt',
    });
    final fields = _fields(map['fieldIds'], nonEmpty: true);
    final completed = _fields(map['completedFieldIds']);
    if (!fields.containsAll(completed)) {
      throw const FormatException('Required data completion changed scope.');
    }
    final revision = _int(map, 'revision', min: 1);
    final status = _enum(
      RehearsalRequiredDataStatus.values,
      _string(map, 'status'),
      'required data status',
    );
    final requestedAt = _date(map, 'requestedAt');
    final expiresAt = _date(map, 'expiresAt');
    final completedAt = _nullableDate(map, 'completedAt');
    if (!requestedAt.isBefore(expiresAt) ||
        (status == RehearsalRequiredDataStatus.completed) !=
            (completedAt != null) ||
        (status == RehearsalRequiredDataStatus.completed) !=
            _sameSet(fields, completed) ||
        completedAt != null &&
            (completedAt.isBefore(requestedAt) ||
                completedAt.isAfter(expiresAt))) {
      throw const FormatException('Required data request state is invalid.');
    }
    return RehearsalRequiredDataRequest(
      revision: revision,
      fields: fields,
      completedFields: completed,
      status: status,
      requestedAt: requestedAt,
      expiresAt: expiresAt,
      completedAt: completedAt,
    );
  }

  final int revision;
  final Set<RehearsalRuntimeField> fields;
  final Set<RehearsalRuntimeField> completedFields;
  final RehearsalRequiredDataStatus status;
  final DateTime requestedAt;
  final DateTime expiresAt;
  final DateTime? completedAt;
}

final class RehearsalRequiredDataReview {
  const RehearsalRequiredDataReview({
    required this.sourceHash,
    required this.profileRevision,
    required this.requestRevision,
    required this.availableFields,
    required this.completedFields,
    required this.request,
  });

  factory RehearsalRequiredDataReview.fromJson(Object? value) {
    final map = _map(value, 'required data review');
    _keys(map, const {
      'sourceHash',
      'profileRevision',
      'requestRevision',
      'availableFieldIds',
      'completedFieldIds',
      'request',
    });
    final available = _fields(map['availableFieldIds']);
    final completed = _fields(map['completedFieldIds']);
    final request = map['request'] == null
        ? null
        : RehearsalRequiredDataRequest.fromJson(map['request']);
    final requestRevision = _int(map, 'requestRevision');
    if (!available.containsAll(completed) ||
        request == null && requestRevision != 0 ||
        request != null &&
            (request.revision != requestRevision ||
                !available.containsAll(request.fields) ||
                !completed.containsAll(request.completedFields))) {
      throw const FormatException('Required data review changed field scope.');
    }
    return RehearsalRequiredDataReview(
      sourceHash: _hash(map, 'sourceHash'),
      profileRevision: _int(map, 'profileRevision'),
      requestRevision: requestRevision,
      availableFields: available,
      completedFields: completed,
      request: request,
    );
  }

  /// Old cross-runtime fixtures embedded private state instead of the Host
  /// review. Preserve those reads without granting a source-fenced action.
  static RehearsalRequiredDataReview? fromHostJson(Object? value) {
    if (value == null) return null;
    final map = _map(value, 'required data review');
    const legacyKeys = {
      'profileRevision',
      'completedFieldIds',
      'requestRevision',
      'request',
    };
    if (map.keys.length == legacyKeys.length &&
        legacyKeys.every(map.containsKey)) {
      _int(map, 'profileRevision');
      _int(map, 'requestRevision');
      _fields(map['completedFieldIds']);
      return null;
    }
    return RehearsalRequiredDataReview.fromJson(map);
  }

  final String sourceHash;
  final int profileRevision;
  final int requestRevision;
  final Set<RehearsalRuntimeField> availableFields;
  final Set<RehearsalRuntimeField> completedFields;
  final RehearsalRequiredDataRequest? request;

  Set<RehearsalRuntimeField> get missingFields =>
      Set.unmodifiable(availableFields.difference(completedFields));
}

enum RehearsalOutcomeKind { none, completion, score, rank }

sealed class RehearsalOutcomeValue {
  const RehearsalOutcomeValue();
  RehearsalOutcomeKind get kind;
  Map<String, Object?> toJson();

  factory RehearsalOutcomeValue.fromJson(Object? value) {
    final map = _map(value, 'practice outcome');
    return switch (_string(map, 'kind')) {
      'completion' => () {
        _keys(map, const {'kind', 'completed'});
        final completed = map['completed'];
        if (completed is! bool) {
          throw const FormatException('Outcome completion must be a boolean.');
        }
        return RehearsalCompletionOutcome(completed);
      }(),
      'score' => () {
        _keys(map, const {'kind', 'score'});
        return RehearsalScoreOutcome(_number(map, 'score'));
      }(),
      'rank' => () {
        _keys(map, const {'kind', 'rank'});
        return RehearsalRankOutcome(_number(map, 'rank'));
      }(),
      _ => throw const FormatException('Unknown practice outcome.'),
    };
  }
}

final class RehearsalCompletionOutcome extends RehearsalOutcomeValue {
  const RehearsalCompletionOutcome(this.completed);
  final bool completed;
  @override
  RehearsalOutcomeKind get kind => RehearsalOutcomeKind.completion;
  @override
  Map<String, Object?> toJson() => {'kind': kind.name, 'completed': completed};
}

final class RehearsalScoreOutcome extends RehearsalOutcomeValue {
  const RehearsalScoreOutcome(this.score);
  final double score;
  @override
  RehearsalOutcomeKind get kind => RehearsalOutcomeKind.score;
  @override
  Map<String, Object?> toJson() => {'kind': kind.name, 'score': score};
}

final class RehearsalRankOutcome extends RehearsalOutcomeValue {
  const RehearsalRankOutcome(this.rank);
  final double rank;
  @override
  RehearsalOutcomeKind get kind => RehearsalOutcomeKind.rank;
  @override
  Map<String, Object?> toJson() => {'kind': kind.name, 'rank': rank};
}

final class RehearsalOutcomeRecord {
  const RehearsalOutcomeRecord({
    required this.unitId,
    required this.round,
    required this.outcome,
    required this.stateRevision,
    required this.recordedAt,
  });

  factory RehearsalOutcomeRecord.fromJson(Object? value) {
    final map = _map(value, 'practice outcome record');
    _keys(map, const {
      'unitId',
      'round',
      'outcome',
      'stateRevision',
      'recordedAt',
    });
    return RehearsalOutcomeRecord(
      unitId: _string(map, 'unitId'),
      round: _int(map, 'round'),
      outcome: RehearsalOutcomeValue.fromJson(map['outcome']),
      stateRevision: _int(map, 'stateRevision', min: 1),
      recordedAt: _date(map, 'recordedAt'),
    );
  }

  final String unitId;
  final int round;
  final RehearsalOutcomeValue outcome;
  final int stateRevision;
  final DateTime recordedAt;
}

final class RehearsalOutcomeReview {
  const RehearsalOutcomeReview({
    required this.kind,
    required this.revision,
    required this.unitIds,
    required this.records,
  });

  factory RehearsalOutcomeReview.fromJson(
    Object? value, {
    required Set<String> expectedUnitIds,
  }) {
    final map = _map(value, 'practice outcome review');
    _keys(map, const {'unitOutcome', 'revision', 'unitIds', 'records'});
    final kind = _enum(
      RehearsalOutcomeKind.values,
      _string(map, 'unitOutcome'),
      'outcome kind',
    );
    final unitIds = _strings(map['unitIds'], 'outcome units');
    final records = _maps(
      map['records'],
      'outcome records',
    ).map(RehearsalOutcomeRecord.fromJson).toList(growable: false);
    final revision = _int(map, 'revision');
    final keys = <String>{};
    if (!_sameSet(unitIds.toSet(), expectedUnitIds) ||
        kind == RehearsalOutcomeKind.none && records.isNotEmpty ||
        records.any(
          (record) =>
              !unitIds.contains(record.unitId) ||
              record.outcome.kind != kind ||
              record.stateRevision > revision ||
              !keys.add('${record.unitId}:${record.round}'),
        )) {
      throw const FormatException('Practice outcome review changed scope.');
    }
    return RehearsalOutcomeReview(
      kind: kind,
      revision: revision,
      unitIds: List.unmodifiable(unitIds),
      records: List.unmodifiable(records),
    );
  }

  final RehearsalOutcomeKind kind;
  final int revision;
  final List<String> unitIds;
  final List<RehearsalOutcomeRecord> records;
}

enum RehearsalRevealStatus { idle, countingDown, revealed }

enum RehearsalRevealAction { startCountdown, cancelPending, publish }

final class RehearsalRevealReview {
  const RehearsalRevealReview({
    required this.revision,
    required this.status,
    required this.publishedRound,
    required this.pendingRound,
    required this.startedAt,
    required this.countdownSeconds,
  });

  factory RehearsalRevealReview.fromJson(Object? value) {
    final map = _map(value, 'practice reveal review');
    _keys(map, const {
      'revision',
      'status',
      'publishedRound',
      'pendingRound',
      'startedAt',
      'countdownSeconds',
    });
    final status = _enum(
      RehearsalRevealStatus.values,
      _string(map, 'status'),
      'reveal status',
    );
    final revision = _int(map, 'revision', max: 2147483647);
    final publishedRound = _int(map, 'publishedRound', min: -1, max: 100);
    final pendingRound = _nullableInt(map, 'pendingRound', max: 100);
    final startedAt = _nullableDate(map, 'startedAt');
    final activeCountdown = status == RehearsalRevealStatus.countingDown;
    if (activeCountdown
        ? pendingRound == null ||
              startedAt == null ||
              pendingRound != publishedRound + 1
        : pendingRound != null ||
              startedAt != null ||
              status == RehearsalRevealStatus.idle && publishedRound != -1 ||
              status == RehearsalRevealStatus.revealed && publishedRound < 0) {
      throw const FormatException('Practice reveal state is inconsistent.');
    }
    return RehearsalRevealReview(
      revision: revision,
      status: status,
      publishedRound: publishedRound,
      pendingRound: pendingRound,
      startedAt: startedAt,
      countdownSeconds: _int(map, 'countdownSeconds', min: 1, max: 300),
    );
  }

  final int revision;
  final RehearsalRevealStatus status;
  final int publishedRound;
  final int? pendingRound;
  final DateTime? startedAt;
  final int countdownSeconds;
}

enum RehearsalAllocationProposalStatus { pending, published, stale }

final class RehearsalAllocationAssignment {
  const RehearsalAllocationAssignment(this.attendeeId, this.unitId);
  factory RehearsalAllocationAssignment.fromJson(Object? value) {
    final map = _map(value, 'practice assignment');
    _keys(map, const {'attendeeId', 'unitId'});
    return RehearsalAllocationAssignment(
      _string(map, 'attendeeId'),
      _nullableString(map, 'unitId'),
    );
  }
  final String attendeeId;
  final String? unitId;
}

final class RehearsalAllocationProposal {
  const RehearsalAllocationProposal({
    required this.id,
    required this.attendeeIds,
    required this.targetUnitId,
    required this.baseRevision,
    required this.status,
    required this.decisionId,
    required this.publishedRevision,
    required this.proposedAt,
    required this.publishedAt,
  });

  factory RehearsalAllocationProposal.fromJson(Object? value) {
    final map = _map(value, 'practice allocation proposal');
    _keys(map, const {
      'proposalId',
      'attendeeIds',
      'targetUnitId',
      'baseRevision',
      'status',
      'decisionId',
      'publishedRevision',
      'proposedAt',
      'publishedAt',
    });
    final status = _enum(
      RehearsalAllocationProposalStatus.values,
      _string(map, 'status'),
      'allocation proposal status',
    );
    final decisionId = _nullableString(map, 'decisionId');
    final publishedRevision = _nullableInt(map, 'publishedRevision');
    final publishedAt = _nullableDate(map, 'publishedAt');
    if (status == RehearsalAllocationProposalStatus.published
        ? decisionId == null || publishedRevision == null || publishedAt == null
        : decisionId != null ||
              publishedRevision != null ||
              publishedAt != null) {
      throw const FormatException(
        'Practice allocation proposal is inconsistent.',
      );
    }
    return RehearsalAllocationProposal(
      id: _string(map, 'proposalId'),
      attendeeIds: List.unmodifiable(
        _strings(map['attendeeIds'], 'proposal attendees', nonEmpty: true),
      ),
      targetUnitId: _string(map, 'targetUnitId'),
      baseRevision: _int(map, 'baseRevision'),
      status: status,
      decisionId: decisionId,
      publishedRevision: publishedRevision,
      proposedAt: _date(map, 'proposedAt'),
      publishedAt: publishedAt,
    );
  }

  final String id;
  final List<String> attendeeIds;
  final String targetUnitId;
  final int baseRevision;
  final RehearsalAllocationProposalStatus status;
  final String? decisionId;
  final int? publishedRevision;
  final DateTime proposedAt;
  final DateTime? publishedAt;
}

final class RehearsalAllocationReview {
  const RehearsalAllocationReview({
    required this.revision,
    required this.unitIds,
    required this.assignments,
    required this.proposals,
  });

  factory RehearsalAllocationReview.fromJson(
    Object? value, {
    required Map<String, String?> actorAssignments,
  }) {
    final map = _map(value, 'practice allocation review');
    _keys(map, const {'revision', 'unitIds', 'assignments', 'proposals'});
    final units = _strings(map['unitIds'], 'allocation units');
    final assignments = _maps(
      map['assignments'],
      'practice assignments',
    ).map(RehearsalAllocationAssignment.fromJson).toList(growable: false);
    final proposals = _maps(
      map['proposals'],
      'allocation proposals',
    ).map(RehearsalAllocationProposal.fromJson).toList(growable: false);
    final assigned = <String, String?>{};
    var invalidAssignment = false;
    for (final item in assignments) {
      if (assigned.containsKey(item.attendeeId) ||
          !actorAssignments.containsKey(item.attendeeId) ||
          item.unitId != actorAssignments[item.attendeeId] ||
          item.unitId != null && !units.contains(item.unitId)) {
        invalidAssignment = true;
        break;
      }
      assigned[item.attendeeId] = item.unitId;
    }
    if (!_sameSet(units.toSet(), actorAssignments.values.nonNulls.toSet()) ||
        invalidAssignment ||
        assigned.length != actorAssignments.length ||
        proposals.any(
          (proposal) =>
              !units.contains(proposal.targetUnitId) ||
              proposal.attendeeIds.any(
                (id) => !actorAssignments.containsKey(id),
              ),
        )) {
      throw const FormatException('Practice allocation review changed scope.');
    }
    return RehearsalAllocationReview(
      revision: _int(map, 'revision'),
      unitIds: List.unmodifiable(units),
      assignments: List.unmodifiable(assignments),
      proposals: List.unmodifiable(proposals),
    );
  }

  final int revision;
  final List<String> unitIds;
  final List<RehearsalAllocationAssignment> assignments;
  final List<RehearsalAllocationProposal> proposals;
}

enum RehearsalRosterRowOutcome { imported, duplicate, ambiguous, failed }

enum RehearsalRosterStatus { pending, reconciled }

final class RehearsalRosterRow {
  const RehearsalRosterRow(this.id, this.outcome, this.actorId);
  factory RehearsalRosterRow.fromJson(Object? value) {
    final map = _map(value, 'practice roster row');
    _keys(map, const {'rowId', 'outcome', 'actorId'});
    return RehearsalRosterRow(
      _string(map, 'rowId'),
      _enum(
        RehearsalRosterRowOutcome.values,
        _string(map, 'outcome'),
        'roster row outcome',
      ),
      _nullableString(map, 'actorId'),
    );
  }
  final String id;
  final RehearsalRosterRowOutcome outcome;
  final String? actorId;
}

final class RehearsalRosterReview {
  const RehearsalRosterReview({
    required this.sourceId,
    required this.sourceRevision,
    required this.status,
    required this.reconciliationRevision,
    required this.reconciledAt,
    required this.importedCount,
    required this.duplicateCount,
    required this.ambiguousCount,
    required this.failedCount,
    required this.rows,
  });

  factory RehearsalRosterReview.fromJson(
    Object? value, {
    required Set<String> actorIds,
  }) {
    final map = _map(value, 'practice roster review');
    _keys(map, const {
      'sourceId',
      'sourceRevision',
      'status',
      'reconciliationRevision',
      'reconciledAt',
      'importedCount',
      'duplicateCount',
      'ambiguousCount',
      'failedCount',
      'rows',
    });
    final rows = _maps(
      map['rows'],
      'practice roster rows',
    ).map(RehearsalRosterRow.fromJson).toList(growable: false);
    final rowIds = <String>{};
    final imported = rows
        .where((row) => row.outcome == RehearsalRosterRowOutcome.imported)
        .map((row) => row.actorId)
        .whereType<String>()
        .toSet();
    final counts = {
      for (final outcome in RehearsalRosterRowOutcome.values)
        outcome: rows.where((row) => row.outcome == outcome).length,
    };
    if (!_sameSet(imported, actorIds) ||
        rows.any(
          (row) =>
              !rowIds.add(row.id) ||
              row.outcome == RehearsalRosterRowOutcome.imported &&
                  row.actorId == null ||
              row.actorId != null && !actorIds.contains(row.actorId),
        ) ||
        counts[RehearsalRosterRowOutcome.imported] !=
            _int(map, 'importedCount') ||
        counts[RehearsalRosterRowOutcome.duplicate] !=
            _int(map, 'duplicateCount') ||
        counts[RehearsalRosterRowOutcome.ambiguous] !=
            _int(map, 'ambiguousCount') ||
        counts[RehearsalRosterRowOutcome.failed] != _int(map, 'failedCount')) {
      throw const FormatException('Practice roster review changed scope.');
    }
    final status = _enum(
      RehearsalRosterStatus.values,
      _string(map, 'status'),
      'roster status',
    );
    final reconciliationRevision = _int(map, 'reconciliationRevision');
    final reconciledAt = _nullableDate(map, 'reconciledAt');
    if ((status == RehearsalRosterStatus.reconciled) !=
            (reconciledAt != null) ||
        status == RehearsalRosterStatus.pending &&
            reconciliationRevision != 0 ||
        status == RehearsalRosterStatus.reconciled &&
            reconciliationRevision < 1) {
      throw const FormatException('Practice roster status is invalid.');
    }
    return RehearsalRosterReview(
      sourceId: _string(map, 'sourceId'),
      sourceRevision: _int(map, 'sourceRevision'),
      status: status,
      reconciliationRevision: reconciliationRevision,
      reconciledAt: reconciledAt,
      importedCount: counts[RehearsalRosterRowOutcome.imported]!,
      duplicateCount: counts[RehearsalRosterRowOutcome.duplicate]!,
      ambiguousCount: counts[RehearsalRosterRowOutcome.ambiguous]!,
      failedCount: counts[RehearsalRosterRowOutcome.failed]!,
      rows: List.unmodifiable(rows),
    );
  }

  final String sourceId;
  final int sourceRevision;
  final RehearsalRosterStatus status;
  final int reconciliationRevision;
  final DateTime? reconciledAt;
  final int importedCount;
  final int duplicateCount;
  final int ambiguousCount;
  final int failedCount;
  final List<RehearsalRosterRow> rows;
}

Map<Object?, Object?> _map(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('$label must be a map.');
}

List<Map<Object?, Object?>> _maps(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('$label must be a list.');
  return value.map((item) => _map(item, label)).toList(growable: false);
}

void _keys(Map<Object?, Object?> map, Set<String> expected) {
  if (map.keys.any((key) => key is! String || !expected.contains(key)) ||
      !expected.every(map.containsKey)) {
    throw const FormatException('Practice operation fields changed.');
  }
}

String _string(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('$key must be a string.');
}

String? _nullableString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value == null || value is String && value.isNotEmpty) {
    return value as String?;
  }
  throw FormatException('$key must be a string or null.');
}

String _hash(Map<Object?, Object?> map, String key) {
  final value = _string(map, key);
  if (RegExp(r'^[a-f0-9]{64}$').hasMatch(value)) return value;
  throw FormatException('$key must be a source hash.');
}

int _int(
  Map<Object?, Object?> map,
  String key, {
  int min = 0,
  int max = 9007199254740991,
}) {
  final value = map[key];
  if (value is num &&
      value.isFinite &&
      value == value.truncateToDouble() &&
      value >= min &&
      value <= max) {
    return value.toInt();
  }
  throw FormatException('$key must be a bounded integer.');
}

int? _nullableInt(
  Map<Object?, Object?> map,
  String key, {
  int min = 0,
  int max = 9007199254740991,
}) => map[key] == null ? null : _int(map, key, min: min, max: max);

double _number(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num && value.isFinite && value.abs() <= 9007199254740991) {
    return value.toDouble();
  }
  throw FormatException('$key must be a bounded number.');
}

DateTime _date(Map<Object?, Object?> map, String key) =>
    DateTime.fromMillisecondsSinceEpoch(_int(map, key));

DateTime? _nullableDate(Map<Object?, Object?> map, String key) =>
    map[key] == null ? null : _date(map, key);

List<String> _strings(Object? value, String label, {bool nonEmpty = false}) {
  if (value is! List<Object?> ||
      value.any((item) => item is! String || item.isEmpty)) {
    throw FormatException('$label must contain strings.');
  }
  final values = value.cast<String>();
  if (values.toSet().length != values.length || nonEmpty && values.isEmpty) {
    throw FormatException('$label must contain unique values.');
  }
  return values;
}

Set<RehearsalRuntimeField> _fields(Object? value, {bool nonEmpty = false}) =>
    Set.unmodifiable(
      _strings(value, 'runtime fields', nonEmpty: nonEmpty).map(
        (name) => _enum(RehearsalRuntimeField.values, name, 'runtime field'),
      ),
    );

T _enum<T extends Enum>(List<T> values, String name, String label) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Unknown $label.');
}

bool _sameSet<T>(Set<T> left, Set<T> right) =>
    left.length == right.length && left.containsAll(right);
