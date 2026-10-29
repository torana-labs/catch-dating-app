import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

part 'event_assistance_checkpoint_support.dart';
part 'event_assistance_checkpoint_reporters.dart';

final class EventAssistanceCheckpointScope {
  const EventAssistanceCheckpointScope({
    required this.group,
    required this.checkpoint,
  });
  final EventAssistanceGroupScope group;
  final AssistanceAccountabilityCheckpoint checkpoint;
  String get checkpointId => checkpoint.checkpointId;
  int get progressRevision => checkpoint.progressRevision;
  void requireMatch(Map<Object?, Object?> map) {
    group.requireMatch(map['context'], map['groupId']);
    if (map['checkpointId'] != checkpointId ||
        assistanceInteger(map['progressRevision']) != progressRevision) {
      throw const FormatException('Checkpoint departure scope changed.');
    }
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceCheckpointScope &&
      other.group == group &&
      other.checkpoint == checkpoint;
  @override
  int get hashCode => Object.hash(group, checkpoint);
}

enum AssistanceCheckpointOutcome { read, applied, replayed }

enum AssistanceCheckpointReportStatus { unreported, partial, complete }

enum AssistanceCheckpointUnavailableReason {
  rosterNotRecorded,
  destinationNotRecorded,
  differentCheckpoint,
  notCheckpoint,
  setupChanged,
}

enum AssistanceCheckpointVisitUnavailableReason {
  registrationMissing,
  visitChanged,
  notCheckedIn,
  invalidSource,
}

sealed class AssistanceCheckpointVisit {
  const AssistanceCheckpointVisit();
  factory AssistanceCheckpointVisit._parse(Object? raw) {
    final map = assistanceObject(raw);
    return switch (map['kind']) {
      'current' => () {
        assistanceObject(map, {'kind'});
        return const AssistanceCheckpointCurrentVisit();
      }(),
      'unavailable' => () {
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceCheckpointUnavailableVisit(
          assistanceEnum(
            AssistanceCheckpointVisitUnavailableReason.values,
            map['reason'],
          ),
        );
      }(),
      _ => throw const FormatException('Unknown checkpoint visit state.'),
    };
  }
}

final class AssistanceCheckpointCurrentVisit extends AssistanceCheckpointVisit {
  const AssistanceCheckpointCurrentVisit();
}

final class AssistanceCheckpointUnavailableVisit
    extends AssistanceCheckpointVisit {
  const AssistanceCheckpointUnavailableVisit(this.reason);
  final AssistanceCheckpointVisitUnavailableReason reason;
}

final class AssistanceCheckpointMember {
  const AssistanceCheckpointMember._(
    this.attendeeId,
    this.accountedFor,
    this.visit,
    this.disposition,
    this.displayName,
  );
  final String attendeeId;

  /// An earlier observation remains evidence even after the visit changes.
  final bool accountedFor;
  final AssistanceCheckpointVisit visit;
  final AssistanceCheckpointDisposition disposition;

  /// Supplied only after verifying the original registration identity.
  final String? displayName;
  bool get canAddObservation => visit is AssistanceCheckpointCurrentVisit;
  factory AssistanceCheckpointMember._parse(Object? raw, int now) {
    final map = assistanceObject(raw);
    assistanceObject(map, {
      'attendeeId',
      'observation',
      'visit',
      if (map.containsKey('disposition')) 'disposition',
      if (map.containsKey('displayName')) 'displayName',
    });
    final observed = map['observation'];
    if (observed != 'accountedFor' && observed != 'unconfirmed') {
      throw const FormatException('Unknown checkpoint observation.');
    }
    final visit = AssistanceCheckpointVisit._parse(map['visit']);
    final disposition = map.containsKey('disposition')
        ? AssistanceCheckpointDisposition._parse(map['disposition'], now)
        : const AssistanceCheckpointDispositionNotProvided();
    if (visit case AssistanceCheckpointUnavailableVisit(:final reason)) {
      if (disposition is! AssistanceCheckpointDispositionNotProvided &&
          (disposition is! AssistanceCheckpointDispositionUnavailable ||
              disposition.reason.name != reason.name)) {
        throw const FormatException(
          'Disposition does not belong to this departure visit.',
        );
      }
    }
    return AssistanceCheckpointMember._(
      assistanceId(map['attendeeId']),
      observed == 'accountedFor',
      visit,
      disposition,
      map['displayName'] == null
          ? null
          : assistanceText(map['displayName'], 120),
    );
  }
}

sealed class AssistanceCheckpointAvailability {
  const AssistanceCheckpointAvailability();

  /// Shared observation vocabulary; persistence and execution scope are separate.
  factory AssistanceCheckpointAvailability.fromJson(
    Object? raw, {
    required int now,
    required List<String>? accountedFor,
  }) {
    final map = assistanceObject(raw);
    if (map['kind'] == 'unavailable') {
      assistanceObject(map, {'kind', 'reason'});
      return AssistanceCheckpointUnavailable(
        assistanceEnum(
          AssistanceCheckpointUnavailableReason.values,
          map['reason'],
        ),
      );
    }
    if (map['kind'] != 'ready') {
      throw const FormatException('Unknown checkpoint availability.');
    }
    assistanceObject(map, {
      'kind',
      'rosterId',
      'label',
      'reportStatus',
      'members',
    });
    final members = _checkpointList(
      map['members'],
    ).map((m) => AssistanceCheckpointMember._parse(m, now)).toList();
    _checkpointIds(members.map((m) => m.attendeeId).toList());
    final status = assistanceEnum(
      AssistanceCheckpointReportStatus.values,
      map['reportStatus'],
    );
    final expected = accountedFor == null
        ? AssistanceCheckpointReportStatus.unreported
        : accountedFor.length == members.length
        ? AssistanceCheckpointReportStatus.complete
        : AssistanceCheckpointReportStatus.partial;
    if (status != expected ||
        !_checkpointSameIds(
          members
              .where((m) => m.accountedFor)
              .map((m) => m.attendeeId)
              .toList(),
          accountedFor ?? const [],
        )) {
      throw const FormatException('Checkpoint roster and report disagree.');
    }
    return AssistanceCheckpointRoster._(
      _checkpointHashId(map['rosterId'], 'departure-roster'),
      assistanceText(map['label'], 240),
      status,
      List.unmodifiable(members),
    );
  }
}

final class AssistanceCheckpointUnavailable
    extends AssistanceCheckpointAvailability {
  const AssistanceCheckpointUnavailable(this.reason);
  final AssistanceCheckpointUnavailableReason reason;
}

final class AssistanceCheckpointRoster
    extends AssistanceCheckpointAvailability {
  const AssistanceCheckpointRoster._(
    this.rosterId,
    this.label,
    this.status,
    this.members,
  );
  final String rosterId, label;
  final AssistanceCheckpointReportStatus status;
  final List<AssistanceCheckpointMember> members;
}

final class AssistanceCheckpointReport {
  const AssistanceCheckpointReport._({
    required this.scope,
    required this.reportId,
    required this.rosterId,
    required this.rosterHash,
    required this.revision,
    required this.accountedFor,
    required this.reportedBy,
    required this.reportedAt,
    required this.correctionReason,
    required this.createdAt,
  });
  final EventAssistanceCheckpointScope scope;
  final String reportId, rosterId, rosterHash, reportedBy;
  final int revision, reportedAt, createdAt;
  final List<String> accountedFor;
  final String? correctionReason;
  factory AssistanceCheckpointReport._parse(
    Object? raw,
    EventAssistanceCheckpointScope scope,
    int now,
  ) {
    final map = assistanceObject(raw, {
      'schemaVersion',
      'reportId',
      'context',
      'groupId',
      'checkpointId',
      'progressRevision',
      'rosterId',
      'rosterHash',
      'revision',
      'accountedFor',
      'reportedBy',
      'reportedAt',
      'correctionReason',
      'createdAt',
    });
    scope.requireMatch(map);
    final createdAt = assistanceInteger(map['createdAt']);
    final reportedAt = assistanceInteger(map['reportedAt']);
    if (map['schemaVersion'] != 1 ||
        createdAt > reportedAt ||
        reportedAt > now) {
      throw const FormatException('Invalid checkpoint report evidence.');
    }
    return AssistanceCheckpointReport._(
      scope: scope,
      reportId: _checkpointHashId(map['reportId'], 'checkpoint'),
      rosterId: _checkpointHashId(map['rosterId'], 'departure-roster'),
      rosterHash: assistanceHash(map['rosterHash']),
      revision: _checkpointPositive(map['revision']),
      accountedFor: _checkpointIds(map['accountedFor']),
      reportedBy: assistanceText(map['reportedBy']),
      reportedAt: reportedAt,
      createdAt: createdAt,
      correctionReason: map['correctionReason'] == null
          ? null
          : _checkpointReason(map['correctionReason']),
    );
  }
}

final class EventAssistanceCheckpointView {
  const EventAssistanceCheckpointView._({
    required this.scope,
    required this.serverTime,
    required this.sourceHash,
    required this.revision,
    required this.report,
    required this.availability,
    required this.request,
    required this.assignment,
    required this.closeout,
    required this.reporterOptions,
  });
  final EventAssistanceCheckpointScope scope;
  final int serverTime, revision;
  final String sourceHash;
  final AssistanceCheckpointReport? report;
  final AssistanceCheckpointAvailability availability;
  final AssistanceCheckpointRequest? request;
  final AssistanceCheckpointSupplement<AssistanceCheckpointAssignment>
  assignment;
  final AssistanceCheckpointSupplement<AssistanceCheckpointCloseout> closeout;
  final AssistanceCheckpointSupplement<AssistanceCheckpointReporterOptions>
  reporterOptions;
  bool get canReport => availability is AssistanceCheckpointRoster;

  factory EventAssistanceCheckpointView.fromCallableData(
    Object? raw, {
    required EventAssistanceCheckpointScope expectedScope,
  }) {
    final map = assistanceObject(raw);
    assistanceObject(map, {
      'context',
      'groupId',
      'checkpointId',
      'progressRevision',
      'serverTime',
      'sourceHash',
      'revision',
      'report',
      'availability',
      'request',
      if (map.containsKey('assignment')) 'assignment',
      if (map.containsKey('closeout')) 'closeout',
      if (map.containsKey('reporterOptions')) 'reporterOptions',
    });
    expectedScope.requireMatch(map);
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['revision']);
    final report = map['report'] == null
        ? null
        : AssistanceCheckpointReport._parse(map['report'], expectedScope, now);
    if (revision != (report?.revision ?? 0)) {
      throw const FormatException('Checkpoint report revision mismatch.');
    }
    final availability = AssistanceCheckpointAvailability.fromJson(
      map['availability'],
      now: now,
      accountedFor: report?.accountedFor,
    );
    if (availability is AssistanceCheckpointRoster &&
        report != null &&
        report.rosterId != availability.rosterId) {
      throw const FormatException('Checkpoint roster and report disagree.');
    }
    final request = map['request'] == null
        ? null
        : AssistanceCheckpointRequest._parse(map['request']);
    final assignment = _checkpointSupplement(
      map,
      'assignment',
      (value) => AssistanceCheckpointAssignment._parse(value, now),
    );
    final closeout = _checkpointSupplement(
      map,
      'closeout',
      (value) => AssistanceCheckpointCloseout._parse(value, expectedScope, now),
    );
    if ((assignment.value != null || closeout.value != null) &&
            request == null ||
        assignment.value?.change != null &&
            assignment.value!.change!.responsibleOperatorId !=
                request?.responsibleOperatorId) {
      throw const FormatException(
        'Checkpoint ownership review is inconsistent.',
      );
    }
    if (request != null) {
      _checkpointRequireRequest(request, availability, report, now);
    }
    if (closeout.value case final value?) {
      _checkpointRequireCloseout(value, availability, report, request!);
    }
    final reporterOptions = _checkpointSupplement(map, 'reporterOptions', (
      value,
    ) {
      if (request == null ||
          assignment.value == null ||
          availability is! AssistanceCheckpointRoster ||
          {
            AssistanceCheckpointRequestState.complete,
            AssistanceCheckpointRequestState.closedOut,
          }.contains(request.state)) {
        throw const FormatException(
          'Reporter choices require an outstanding original request.',
        );
      }
      return AssistanceCheckpointReporterOptions.fromJson(
        value,
        serverTime: now,
        dueAt: request.dueAt,
        assignmentHash: assignment.value!.sourceHash,
      );
    });
    return EventAssistanceCheckpointView._(
      scope: expectedScope,
      serverTime: now,
      sourceHash: assistanceHash(map['sourceHash']),
      revision: revision,
      report: report,
      availability: availability,
      request: request,
      assignment: assignment,
      closeout: closeout,
      reporterOptions: reporterOptions,
    );
  }
}

final class EventAssistanceCheckpointResult {
  const EventAssistanceCheckpointResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceCheckpointOutcome outcome;

  /// Each operation verifies this against its own report/assignment/closeout revision.
  final int? operationRevision;
  final EventAssistanceCheckpointView view;
  factory EventAssistanceCheckpointResult.fromCallableData(
    Object? raw, {
    required EventAssistanceCheckpointScope expectedScope,
  }) {
    final map = assistanceObject(raw, {'outcome', 'operationRevision', 'view'});
    final outcome = assistanceEnum(
      AssistanceCheckpointOutcome.values,
      map['outcome'],
    );
    final revision = map['operationRevision'] == null
        ? null
        : _checkpointPositive(map['operationRevision']);
    if ((outcome == AssistanceCheckpointOutcome.read) != (revision == null)) {
      throw const FormatException('Invalid checkpoint operation receipt.');
    }
    return EventAssistanceCheckpointResult._(
      outcome,
      revision,
      EventAssistanceCheckpointView.fromCallableData(
        map['view'],
        expectedScope: expectedScope,
      ),
    );
  }
}

String _checkpointHashId(Object? raw, String prefix) {
  final text = assistanceText(raw);
  if (!text.startsWith('$prefix:')) {
    throw const FormatException('Invalid checkpoint record identity.');
  }
  assistanceHash(text.substring(prefix.length + 1));
  return text;
}

int _checkpointPositive(Object? raw) {
  final value = assistanceInteger(raw);
  if (value == 0) {
    throw const FormatException('Expected a recorded checkpoint revision.');
  }
  return value;
}

String _checkpointReason(Object? raw) {
  final value = assistanceText(raw, 500);
  if (value.trim().isEmpty || value != value.trim()) {
    throw const FormatException('Explain the checkpoint correction.');
  }
  return value;
}

String _checkpointOperator(Object? raw) {
  final value = assistanceText(raw, 128);
  if (value.contains('/')) {
    throw const FormatException('Invalid checkpoint operator.');
  }
  return value;
}

List<Object?> _checkpointList(Object? raw) {
  if (raw is! List || raw.length > 1000) {
    throw const FormatException('Invalid checkpoint roster.');
  }
  return raw.cast<Object?>();
}

List<String> _checkpointIds(Object? raw) {
  final ids = _checkpointList(raw).map(assistanceId).toList(growable: false);
  for (var i = 1; i < ids.length; i++) {
    if (ids[i - 1].compareTo(ids[i]) >= 0) {
      throw const FormatException(
        'Checkpoint identities must be unique and ordered.',
      );
    }
  }
  return List.unmodifiable(ids);
}

bool _checkpointSameIds(List<String> a, List<String> b) =>
    a.length == b.length &&
    Iterable<int>.generate(a.length).every((i) => a[i] == b[i]);
