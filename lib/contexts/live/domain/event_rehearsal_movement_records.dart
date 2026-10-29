part of 'event_rehearsal_movement.dart';

final class RehearsalDepartureMember {
  const RehearsalDepartureMember._(
    this.attendeeId,
    this.displayName,
    this.visitHash,
    this.episodeId,
    this.membershipHash,
  );
  final String attendeeId, displayName, visitHash;
  final String? episodeId, membershipHash;
  factory RehearsalDepartureMember._parse(
    Object? raw,
    RehearsalMovementScope scope,
  ) {
    final m = assistanceObject(raw, {
      'attendeeId',
      'displayName',
      'visitHash',
      'episodeId',
      'membershipHash',
    });
    final episode = m['episodeId'] == null
        ? null
        : assistanceText(m['episodeId']);
    final membership = m['membershipHash'] == null
        ? null
        : assistanceHash(m['membershipHash']);
    if (episode != null &&
            !RegExp(r'^episode:[a-f0-9]{64}$').hasMatch(episode) ||
        (scope.groupId == 'event:whole'
            ? membership != null
            : membership == null || episode == null)) {
      throw const FormatException(
        'Departure membership belongs to another group.',
      );
    }
    return RehearsalDepartureMember._(
      _movementId(m['attendeeId']),
      assistanceText(m['displayName'], 180),
      assistanceHash(m['visitHash']),
      episode,
      membership,
    );
  }
  Map<String, Object?> toJson() => {
    'attendeeId': attendeeId,
    'displayName': displayName,
    'visitHash': visitHash,
    'episodeId': episodeId,
    'membershipHash': membershipHash,
  };
}

final class RehearsalRecordedDepartureRoster {
  const RehearsalRecordedDepartureRoster._(this.members, this.selectionHash);
  final List<RehearsalDepartureMember> members;
  final String selectionHash;
  factory RehearsalRecordedDepartureRoster._parse(
    Object? raw,
    RehearsalMovementScope scope,
  ) {
    final m = assistanceObject(raw, {'members', 'selectionHash'});
    final members = _movementList(
      m['members'],
      50,
    ).map((v) => RehearsalDepartureMember._parse(v, scope)).toList();
    _movementCanonicalIds(members.map((m) => m.attendeeId).toList());
    return RehearsalRecordedDepartureRoster._(
      List.unmodifiable(members),
      assistanceHash(m['selectionHash']),
    );
  }
  Map<String, Object?> toJson() => {
    'members': members.map((m) => m.toJson()).toList(),
    'selectionHash': selectionHash,
  };
}

final class RehearsalDeparture {
  const RehearsalDeparture._({
    required this.sourceHash,
    required this.destination,
    required this.confirmedAt,
    required this.confirmedBy,
    required this.operationId,
    required this.roster,
    required this.checkpointRequest,
  });
  final String sourceHash, confirmedBy, operationId;
  final int confirmedAt;
  final AssistanceJoiningTarget destination;

  /// Null means no roster was recorded; an empty list is an explicit roster.
  final RehearsalRecordedDepartureRoster? roster;
  final AssistanceDepartureCheckpointRequest? checkpointRequest;
  String? get checkpointId => switch (destination) {
    AssistanceFixedPlace() => null,
    AssistanceItineraryStop(:final stopId) => stopId,
    AssistanceGroupCheckpoint(:final checkpointId) => checkpointId,
  };
  String get hash => _movementHash(toJson());
  factory RehearsalDeparture._parse(
    Object? raw,
    RehearsalMovementScope scope,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw, {
      'sourceHash',
      'destination',
      'confirmedAt',
      'confirmedBy',
      'operationId',
      'roster',
      'checkpointRequest',
    });
    final at = _movementTime(m['confirmedAt'], session);
    final target = _movementTarget(m['destination'], scope);
    final roster = m['roster'] == null
        ? null
        : RehearsalRecordedDepartureRoster._parse(m['roster'], scope);
    final request = _movementRequest(m['checkpointRequest']);
    _movementRequireRequest(request, target, at, roster?.members.length);
    return RehearsalDeparture._(
      sourceHash: assistanceHash(m['sourceHash']),
      destination: target,
      confirmedAt: at,
      confirmedBy: _movementId(m['confirmedBy']),
      operationId: _movementId(m['operationId']),
      roster: roster,
      checkpointRequest: request,
    );
  }
  Map<String, Object?> toJson() => {
    'sourceHash': sourceHash,
    'destination': destination.toJson(),
    'confirmedAt': confirmedAt,
    'confirmedBy': confirmedBy,
    'operationId': operationId,
    'roster': roster?.toJson(),
    'checkpointRequest': checkpointRequest?.toJson(),
  };
}

final class RehearsalCheckpointReport {
  const RehearsalCheckpointReport._(
    this.revision,
    this.rosterHash,
    this.accountedFor,
    this.reportedAt,
    this.reportedBy,
    this.correctionReason,
  );
  final int revision, reportedAt;
  final String rosterHash, reportedBy;
  final List<String> accountedFor;
  final String? correctionReason;
  factory RehearsalCheckpointReport._parse(
    Object? raw,
    RehearsalDeparture departure,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw, {
      'revision',
      'rosterHash',
      'accountedFor',
      'reportedAt',
      'reportedBy',
      'correctionReason',
    });
    final revision = assistanceInteger(m['revision']);
    final ids = _movementList(m['accountedFor'], 50).map(_movementId).toList();
    _movementCanonicalIds(ids);
    final at = _movementTime(m['reportedAt'], session);
    final hash = assistanceHash(m['rosterHash']);
    final reason = m['correctionReason'] == null
        ? null
        : assistanceText(m['correctionReason'], 500);
    if (revision < 1 ||
        departure.roster == null ||
        departure.checkpointId == null ||
        at < departure.confirmedAt ||
        hash != departure.hash ||
        !ids.every(
          (id) => departure.roster!.members.any((m) => m.attendeeId == id),
        ) ||
        reason != null && reason.trim().isEmpty) {
      throw const FormatException(
        'Checkpoint report does not match its departure.',
      );
    }
    return RehearsalCheckpointReport._(
      revision,
      hash,
      List.unmodifiable(ids),
      at,
      _movementId(m['reportedBy']),
      reason,
    );
  }
  Map<String, Object?> toJson() => {
    'revision': revision,
    'rosterHash': rosterHash,
    'accountedFor': accountedFor.toList(),
    'reportedAt': reportedAt,
    'reportedBy': reportedBy,
    'correctionReason': correctionReason,
  };
}

final class RehearsalMovementRecord {
  const RehearsalMovementRecord._(
    this.scope,
    this.revision,
    this.departure,
    this.report,
    this.assignment,
    this.closeout,
  );
  final RehearsalMovementScope scope;
  final int revision;
  final RehearsalDeparture departure;
  final RehearsalCheckpointReport? report;
  final RehearsalCheckpointReassignment? assignment;
  final RehearsalCheckpointCloseoutChange? closeout;
  factory RehearsalMovementRecord._parse(
    Object? raw,
    RehearsalMovementScope scope,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw);
    assistanceObject(m, {
      'sessionId',
      'clockId',
      'groupId',
      'progressRevision',
      'departure',
      'report',
      if (m.containsKey('assignment')) 'assignment',
      if (m.containsKey('closeout')) 'closeout',
    });
    if (m['sessionId'] != scope.sessionId ||
        m['clockId'] != scope.clockId ||
        m['groupId'] != scope.groupId) {
      throw const FormatException(
        'Departure belongs to another rehearsal group.',
      );
    }
    final departure = RehearsalDeparture._parse(m['departure'], scope, session);
    final report = m['report'] == null
        ? null
        : RehearsalCheckpointReport._parse(m['report'], departure, session);
    final assignment = m['assignment'] == null
        ? null
        : RehearsalCheckpointReassignment._parse(
            m['assignment'],
            departure,
            session,
          );
    final closeout = m['closeout'] == null
        ? null
        : RehearsalCheckpointCloseoutChange._parse(
            m['closeout'],
            departure,
            report,
            session,
          );
    if (closeout != null && closeout.operationId == assignment?.operationId) {
      throw const FormatException(
        'Management decisions need distinct operations.',
      );
    }
    if (m.containsKey('assignment') && assignment == null ||
        m.containsKey('closeout') && closeout == null) {
      throw const FormatException('A stored management change cannot be null.');
    }
    return RehearsalMovementRecord._(
      scope,
      _movementRevision(m['progressRevision'], positive: true),
      departure,
      report,
      assignment,
      closeout,
    );
  }
  Map<String, Object?> toJson() => {
    'sessionId': scope.sessionId,
    'clockId': scope.clockId,
    'groupId': scope.groupId,
    'progressRevision': revision,
    'departure': departure.toJson(),
    'report': report?.toJson(),
    if (assignment != null) 'assignment': assignment!.toJson(),
    if (closeout != null) 'closeout': closeout!.toJson(),
  };
}

final class RehearsalMovementSummary {
  const RehearsalMovementSummary._(
    this.revision,
    this.destination,
    this.confirmedAt,
    this.rosterSize,
    this.reportRevision,
    this.accountedForCount,
    this.checkpointRequest,
  );
  final int revision, confirmedAt, reportRevision, accountedForCount;
  final int? rosterSize;
  final AssistanceJoiningTarget destination;
  final AssistanceDepartureCheckpointRequest? checkpointRequest;
  factory RehearsalMovementSummary._parse(
    Object? raw,
    RehearsalMovementScope scope,
    EventRehearsalSession session,
  ) {
    final m = assistanceObject(raw, {
      'progressRevision',
      'destination',
      'confirmedAt',
      'rosterSize',
      'reportRevision',
      'accountedForCount',
      'checkpointRequest',
    });
    final target = _movementTarget(m['destination'], scope);
    final size = assistanceNullableInteger(m['rosterSize']);
    final reportRevision = assistanceInteger(m['reportRevision']);
    final count = assistanceInteger(m['accountedForCount']);
    final at = _movementTime(m['confirmedAt'], session);
    final request = _movementRequest(m['checkpointRequest']);
    if (size != null && size > 50 ||
        count > (size ?? 0) ||
        reportRevision == 0 && count != 0 ||
        reportRevision > 0 &&
            (size == null || target is AssistanceFixedPlace)) {
      throw const FormatException('Movement summary has inconsistent counts.');
    }
    _movementRequireRequest(request, target, at, size);
    return RehearsalMovementSummary._(
      _movementRevision(m['progressRevision'], positive: true),
      target,
      at,
      size,
      reportRevision,
      count,
      request,
    );
  }
}

void _movementCanonicalIds(List<String> ids) {
  for (var i = 1; i < ids.length; i++) {
    if (ids[i - 1].compareTo(ids[i]) >= 0) {
      throw const FormatException(
        'Departure identities must be ordered and unique.',
      );
    }
  }
}

int _movementTime(Object? raw, EventRehearsalSession session) {
  final at = assistanceInteger(raw);
  if (at < session.virtualStartedAt!.millisecondsSinceEpoch ||
      at > session.virtualNow.millisecondsSinceEpoch) {
    throw const FormatException(
      'Movement time is outside this rehearsal clock.',
    );
  }
  return at;
}

AssistanceDepartureCheckpointRequest? _movementRequest(Object? raw) {
  if (raw == null) return null;
  final m = assistanceObject(raw, {'responsibleOperatorId', 'dueAt'});
  return AssistanceDepartureCheckpointRequest(
    responsibleOperatorId: assistanceText(m['responsibleOperatorId'], 128),
    dueAt: assistanceInteger(m['dueAt']),
  );
}

void _movementRequireRequest(
  AssistanceDepartureCheckpointRequest? request,
  AssistanceJoiningTarget target,
  int at,
  int? rosterSize,
) {
  if (request != null &&
      (rosterSize == null ||
          target is AssistanceFixedPlace ||
          request.dueAt < at)) {
    throw const FormatException(
      'Checkpoint request needs a recorded departure roster.',
    );
  }
}
