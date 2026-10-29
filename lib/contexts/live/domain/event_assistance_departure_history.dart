import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

final class EventAssistanceDepartureHistoryQuery {
  EventAssistanceDepartureHistoryQuery(this.group, {this.beforeRevision}) {
    if (beforeRevision != null && assistanceInteger(beforeRevision) < 1) {
      throw const FormatException('Invalid departure history cursor.');
    }
  }
  final EventAssistanceGroupScope group;
  final int? beforeRevision;

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceDepartureHistoryQuery &&
      other.group == group &&
      other.beforeRevision == beforeRevision;
  @override
  int get hashCode => Object.hash(group, beforeRevision);
}

enum AssistanceDepartureHistorySource {
  current,
  setupChanged,
  destinationNotRecorded,
}

/// Saved report evidence. This is deliberately not the current request state.
final class AssistanceDepartureHistoryCheckpoint {
  const AssistanceDepartureHistoryCheckpoint._({
    required this.scope,
    required this.status,
    required this.reportRevision,
    required this.accountedForCount,
    required this.originalRequestedDueAt,
  });
  final EventAssistanceCheckpointScope scope;
  final AssistanceCheckpointReportStatus status;
  final int reportRevision, accountedForCount;
  final int? originalRequestedDueAt;
}

final class AssistanceDepartureHistoryRow {
  const AssistanceDepartureHistoryRow._({
    required this.progressRevision,
    required this.confirmedAt,
    required this.destination,
    required this.label,
    required this.sourceState,
    required this.rosterSize,
    required this.checkpoint,
  });
  final int progressRevision, confirmedAt, rosterSize;
  final AssistanceJoiningTarget? destination;
  final String? label;
  final AssistanceDepartureHistorySource sourceState;
  final AssistanceDepartureHistoryCheckpoint? checkpoint;

  static AssistanceDepartureHistoryRow _parse(
    Object? raw,
    EventAssistanceGroupScope scope,
    int now,
  ) {
    final map = assistanceObject(raw, {
      'progressRevision',
      'confirmedAt',
      'destination',
      'label',
      'sourceState',
      'rosterSize',
      'checkpoint',
    });
    final revision = assistanceInteger(map['progressRevision']);
    final at = assistanceInteger(map['confirmedAt']);
    final size = assistanceInteger(map['rosterSize']);
    final source = assistanceEnum(
      AssistanceDepartureHistorySource.values,
      map['sourceState'],
    );
    final label = map['label'] == null
        ? null
        : assistanceText(map['label'], 240);
    final destination = map['destination'] == null
        ? null
        : AssistanceJoiningTarget.fromJson(map['destination']);
    if (revision < 1 ||
        at > now ||
        size > 1000 ||
        (source == AssistanceDepartureHistorySource.current) !=
            (label != null) ||
        (source == AssistanceDepartureHistorySource.current &&
            destination == null) ||
        (source == AssistanceDepartureHistorySource.destinationNotRecorded &&
            destination != null) ||
        (destination is AssistanceGroupCheckpoint &&
            destination.groupId != scope.groupId)) {
      throw const FormatException('Invalid historical departure.');
    }
    final checkpointId = switch (destination) {
      AssistanceItineraryStop(:final stopId) => stopId,
      AssistanceGroupCheckpoint(:final checkpointId) => checkpointId,
      _ => null,
    };
    AssistanceDepartureHistoryCheckpoint? checkpoint;
    if (map['checkpoint'] != null) {
      final value = assistanceObject(map['checkpoint'], {
        'checkpointId',
        'reportStatus',
        'reportRevision',
        'accountedForCount',
        'originalRequestedDueAt',
      });
      final status = assistanceEnum(
        AssistanceCheckpointReportStatus.values,
        value['reportStatus'],
      );
      final reportRevision = assistanceInteger(value['reportRevision']);
      final count = assistanceInteger(value['accountedForCount']);
      final dueAt = assistanceNullableInteger(value['originalRequestedDueAt']);
      if (checkpointId == null ||
          checkpointId != value['checkpointId'] ||
          count > size ||
          (dueAt != null &&
              (dueAt < at || dueAt > at + 7 * 24 * 60 * 60 * 1000)) ||
          (status == AssistanceCheckpointReportStatus.unreported
              ? reportRevision != 0 || count != 0
              : reportRevision < 1 ||
                    (status == AssistanceCheckpointReportStatus.complete) !=
                        (count == size))) {
        throw const FormatException('Invalid historical checkpoint evidence.');
      }
      checkpoint = AssistanceDepartureHistoryCheckpoint._(
        scope: EventAssistanceCheckpointScope(
          group: scope,
          checkpoint: AssistanceAccountabilityCheckpoint(
            checkpointId: checkpointId,
            progressRevision: revision,
          ),
        ),
        status: status,
        reportRevision: reportRevision,
        accountedForCount: count,
        originalRequestedDueAt: dueAt,
      );
    } else if (checkpointId != null) {
      throw const FormatException('Missing historical checkpoint summary.');
    }
    return AssistanceDepartureHistoryRow._(
      progressRevision: revision,
      confirmedAt: at,
      destination: destination,
      label: label,
      sourceState: source,
      rosterSize: size,
      checkpoint: checkpoint,
    );
  }
}

/// One bounded page. An empty page says nothing about unrecorded departures.
final class EventAssistanceDepartureHistoryPage {
  const EventAssistanceDepartureHistoryPage._({
    required this.query,
    required this.actorUid,
    required this.validUntil,
    required this.serverTime,
    required this.progressRevision,
    required this.rosters,
    required this.nextBeforeRevision,
  });
  final EventAssistanceDepartureHistoryQuery query;
  final String actorUid;
  final int validUntil, serverTime, progressRevision;
  final List<AssistanceDepartureHistoryRow> rosters;
  final int? nextBeforeRevision;

  factory EventAssistanceDepartureHistoryPage.fromCallableData(
    Object? raw, {
    required EventAssistanceDepartureHistoryQuery expectedQuery,
    required String expectedActorUid,
  }) {
    final map = assistanceObject(raw, {
      'context',
      'groupId',
      'actorUid',
      'validUntil',
      'serverTime',
      'progressRevision',
      'coverage',
      'rosters',
      'nextBeforeRevision',
    });
    expectedQuery.group.requireMatch(map['context'], map['groupId']);
    final actor = assistanceText(map['actorUid'], 128);
    final until = assistanceInteger(map['validUntil']);
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['progressRevision']);
    final next = assistanceNullableInteger(map['nextBeforeRevision']);
    final rows = map['rosters'];
    if (map['coverage'] != 'page' ||
        actor != expectedActorUid ||
        until <= now ||
        rows is! List ||
        rows.length > 10) {
      throw const FormatException('Invalid departure history page.');
    }
    final parsed = rows
        .map(
          (r) =>
              AssistanceDepartureHistoryRow._parse(r, expectedQuery.group, now),
        )
        .toList(growable: false);
    int? previous = expectedQuery.beforeRevision;
    var previousTime = now;
    for (final row in parsed) {
      if (row.progressRevision > revision ||
          (previous != null && row.progressRevision >= previous) ||
          row.confirmedAt > previousTime) {
        throw const FormatException('Unordered departure history page.');
      }
      previous = row.progressRevision;
      previousTime = row.confirmedAt;
    }
    if (next != null &&
        (parsed.length != 10 || next != parsed.last.progressRevision)) {
      throw const FormatException('Invalid departure history continuation.');
    }
    return EventAssistanceDepartureHistoryPage._(
      query: expectedQuery,
      actorUid: actor,
      validUntil: until,
      serverTime: now,
      progressRevision: revision,
      rosters: List.unmodifiable(parsed),
      nextBeforeRevision: next,
    );
  }
}
