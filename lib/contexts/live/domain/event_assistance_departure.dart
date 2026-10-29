import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// Explicitly selected people, never inferred from the event's current roster.
final class EventAssistanceDepartureRosterSelection {
  EventAssistanceDepartureRosterSelection(Iterable<String> attendeeIds)
    : attendeeIds = List.unmodifiable(attendeeIds.toList()..sort()) {
    if (this.attendeeIds.length > 1000 ||
        this.attendeeIds.toSet().length != this.attendeeIds.length) {
      throw ArgumentError('Select at most 1,000 distinct attendees.');
    }
    for (final id in this.attendeeIds) {
      assistanceId(id);
    }
  }

  final List<String> attendeeIds;
}

/// The server reviewed this selection for this exact client progress snapshot.
/// Its source hash is rechecked atomically when departure is confirmed.
final class EventAssistanceDepartureRosterReview {
  const EventAssistanceDepartureRosterReview._({
    required this.snapshot,
    required this.attendeeIds,
    required this.sourceHash,
    required this.serverTime,
  });

  factory EventAssistanceDepartureRosterReview.fromCallableData(
    Object? value, {
    required EventAssistanceGroupProgressView snapshot,
    required EventAssistanceDepartureRosterSelection expectedSelection,
  }) {
    final map = assistanceObject(value, {
      'context',
      'groupId',
      'serverTime',
      'progressRevision',
      'selection',
    });
    snapshot.scope.requireMatch(map['context'], map['groupId']);
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['progressRevision']);
    final selection = assistanceObject(map['selection'], {
      'attendeeIds',
      'expectedSourceHash',
    });
    final ids = selection['attendeeIds'];
    if (ids is! List ||
        ids.length != expectedSelection.attendeeIds.length ||
        revision != snapshot.revision ||
        now < snapshot.serverTime ||
        now >= snapshot.authority.validUntil) {
      throw const FormatException('Departure roster review changed.');
    }
    for (var index = 0; index < ids.length; index++) {
      if (ids[index] != expectedSelection.attendeeIds[index]) {
        throw const FormatException('Departure roster selection mismatch.');
      }
    }
    return EventAssistanceDepartureRosterReview._(
      snapshot: snapshot,
      attendeeIds: expectedSelection.attendeeIds,
      sourceHash: assistanceHash(selection['expectedSourceHash']),
      serverTime: now,
    );
  }

  final EventAssistanceGroupProgressView snapshot;
  final List<String> attendeeIds;
  final String sourceHash;
  final int serverTime;

  Map<String, Object?> toJson() => {
    'attendeeIds': attendeeIds,
    'expectedSourceHash': sourceHash,
  };
}

final class AssistanceDepartureCheckpointRequest {
  AssistanceDepartureCheckpointRequest({
    required this.responsibleOperatorId,
    required this.dueAt,
  }) {
    assistanceText(responsibleOperatorId, 128);
    if (responsibleOperatorId.contains('/')) {
      throw ArgumentError('Invalid checkpoint operator.');
    }
    assistanceInteger(dueAt);
  }

  final String responsibleOperatorId;
  final int dueAt;

  Map<String, Object?> toJson() => {
    'responsibleOperatorId': responsibleOperatorId,
    'dueAt': dueAt,
  };
}

/// A frozen host decision. Reuse this object and operation ID after ambiguous
/// transport failure; a refreshed snapshot requires a new explicit decision.
final class EventAssistanceDepartureChange {
  const EventAssistanceDepartureChange._({
    required this.snapshot,
    required this.operationId,
    required this.destination,
    required this.roster,
    required this.checkpoint,
  });

  factory EventAssistanceDepartureChange.prepare({
    required EventAssistanceGroupProgressView snapshot,
    required String operationId,
    required AssistanceJoiningTarget destination,
    EventAssistanceDepartureRosterReview? roster,
    AssistanceDepartureCheckpointRequest? checkpoint,
  }) {
    assistanceId(operationId);
    if (!snapshot.canConfirm) {
      throw StateError('Departure confirmation is unavailable.');
    }
    final target = AssistanceJoiningTarget.fromJson(destination.toJson());
    if (!snapshot.destinations.any((item) => item.target == target)) {
      throw ArgumentError('Choose a destination from the reviewed event.');
    }
    if (roster != null && !identical(roster.snapshot, snapshot)) {
      throw ArgumentError('Review the roster for this progress snapshot.');
    }
    if (checkpoint != null) {
      if (roster == null || target is AssistanceFixedPlace) {
        throw ArgumentError(
          'A checkpoint needs a reviewed roster and route stop.',
        );
      }
      final authority = snapshot.authority as AssistanceCanConfirmDeparture;
      final now = roster.serverTime;
      if (checkpoint.dueAt < now ||
          checkpoint.dueAt > now + 604800000 ||
          (authority.checkpointReporter ==
                  AssistanceCheckpointReporter.selfOnly &&
              (checkpoint.responsibleOperatorId != snapshot.actorUid ||
                  checkpoint.dueAt >= authority.validUntil))) {
        throw ArgumentError(
          'Choose a permitted checkpoint reporter and deadline.',
        );
      }
      // The backend also checks the reporter's current duty and event closeout
      // deadline. A name here cannot grant that person authority.
    }
    return EventAssistanceDepartureChange._(
      snapshot: snapshot,
      operationId: operationId,
      destination: target,
      roster: roster,
      checkpoint: checkpoint,
    );
  }

  final EventAssistanceGroupProgressView snapshot;
  final String operationId;
  final AssistanceJoiningTarget destination;
  final EventAssistanceDepartureRosterReview? roster;
  final AssistanceDepartureCheckpointRequest? checkpoint;

  void requireResult(EventAssistanceGroupProgressResult result) {
    if (result.view.scope != snapshot.scope ||
        result.view.actorUid != snapshot.actorUid ||
        result.view.serverTime < snapshot.serverTime ||
        result.outcome == AssistanceProgressOutcome.read ||
        result.operationRevision != snapshot.revision + 1) {
      throw const FormatException('Invalid departure confirmation receipt.');
    }
    // A replay may return later progress; only its operation revision is the
    // receipt for this decision. Never compare later progress with this target.
    if (result.view.revision == result.operationRevision &&
        (result.view.progress?.destination != destination ||
            result.view.progress?.sourceHash != snapshot.sourceHash ||
            result.view.progress?.confirmedBy != snapshot.actorUid)) {
      throw const FormatException(
        'Departure receipt does not match the decision.',
      );
    }
  }

  Map<String, Object?> get command => {
    'kind': 'confirmDeparture',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'groupId': snapshot.scope.groupId,
      'destination': destination.toJson(),
      'expectedProgressRevision': snapshot.revision,
      if (roster != null) 'departureRoster': roster!.toJson(),
      if (checkpoint != null) 'checkpointRequest': checkpoint!.toJson(),
    },
  };
}
