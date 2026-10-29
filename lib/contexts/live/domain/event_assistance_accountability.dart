import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

/// Explicit context for a recorded departure. It is not a report of arrival.
final class AssistanceAccountabilityCheckpoint {
  AssistanceAccountabilityCheckpoint({
    required this.checkpointId,
    required this.progressRevision,
  }) {
    assistanceText(checkpointId);
    assistanceInteger(progressRevision);
    if (progressRevision == 0) {
      throw const FormatException('Choose a recorded departure.');
    }
  }
  final String checkpointId;
  final int progressRevision;
  Map<String, Object?> toJson() => {
    'checkpointId': checkpointId,
    'progressRevision': progressRevision,
  };
  @override
  bool operator ==(Object other) =>
      other is AssistanceAccountabilityCheckpoint &&
      other.checkpointId == checkpointId &&
      other.progressRevision == progressRevision;
  @override
  int get hashCode => Object.hash(checkpointId, progressRevision);
}

final class EventAssistanceAccountabilityScope {
  EventAssistanceAccountabilityScope({
    required this.group,
    required this.attendeeId,
    this.checkpoint,
  }) {
    assistanceId(attendeeId);
  }
  final EventAssistanceGroupScope group;
  final String attendeeId;
  final AssistanceAccountabilityCheckpoint? checkpoint;
  EventAssistanceGuestScope get guest => EventAssistanceGuestScope(
    organizerId: group.organizerId,
    eventId: group.eventId,
    attendeeId: attendeeId,
  );

  void requireMatch(Map<Object?, Object?> map) {
    group.requireMatch(map['context'], map['groupId']);
    if (map['attendeeId'] != attendeeId ||
        map.containsKey('checkpoint') != (checkpoint != null)) {
      throw const FormatException('Accountability review scope changed.');
    }
    if (checkpoint case final expected?) {
      final value = assistanceObject(map['checkpoint'], {
        'checkpointId',
        'progressRevision',
      });
      if (value['checkpointId'] != expected.checkpointId ||
          assistanceInteger(value['progressRevision']) !=
              expected.progressRevision) {
        throw const FormatException('Accountability departure changed.');
      }
    }
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceAccountabilityScope &&
      other.group == group &&
      other.attendeeId == attendeeId &&
      other.checkpoint == checkpoint;
  @override
  int get hashCode => Object.hash(group, attendeeId, checkpoint);
}

/// These describe the event visit. Returned never implies checkpoint arrival;
/// departed never describes the group's movement between stops.
enum AssistanceVisitDisposition { returned, departed, unresolved }

enum AssistanceAccountabilityOutcome { read, applied, replayed }

enum AssistanceAccountabilityUnavailableReason {
  notApplicable,
  notCheckedIn,
  departureNotRecorded,
  notOnDeparture,
  visitChanged,
  setupChanged,
  differentCheckpoint,
  destinationNotRecorded,
  notCheckpoint,
}

sealed class AssistanceAccountabilityAvailability {
  const AssistanceAccountabilityAvailability();
  factory AssistanceAccountabilityAvailability.fromJson(Object? raw) {
    final map = assistanceObject(raw);
    return switch (map['kind']) {
      'ready' => () {
        assistanceObject(map, {'kind'});
        return const AssistanceAccountabilityReady();
      }(),
      'unavailable' => () {
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceAccountabilityUnavailable(
          assistanceEnum(
            AssistanceAccountabilityUnavailableReason.values,
            map['reason'],
          ),
        );
      }(),
      _ => throw const FormatException('Unknown accountability availability.'),
    };
  }
}

final class AssistanceAccountabilityReady
    extends AssistanceAccountabilityAvailability {
  const AssistanceAccountabilityReady();
}

final class AssistanceAccountabilityUnavailable
    extends AssistanceAccountabilityAvailability {
  const AssistanceAccountabilityUnavailable(this.reason);
  final AssistanceAccountabilityUnavailableReason reason;
}

final class EventAssistanceAccountabilityView {
  const EventAssistanceAccountabilityView._({
    required this.scope,
    required this.sourceHash,
    required this.serverTime,
    required this.revision,
    required this.episodeId,
    required this.disposition,
    required this.availability,
  });
  final EventAssistanceAccountabilityScope scope;
  final String sourceHash;
  final int serverTime, revision;

  /// Null is explicit absence of assistance; a physical visit can still exist.
  final String? episodeId;
  final AssistanceVisitDisposition disposition;
  final AssistanceAccountabilityAvailability availability;
  bool get canResolve => availability is AssistanceAccountabilityReady;

  factory EventAssistanceAccountabilityView._parse(
    Object? raw,
    EventAssistanceAccountabilityScope scope,
  ) {
    final map = assistanceObject(raw, {
      'context',
      'groupId',
      'attendeeId',
      'serverTime',
      'sourceHash',
      'revision',
      'episodeId',
      'disposition',
      'availability',
      if (scope.checkpoint != null) 'checkpoint',
    });
    scope.requireMatch(map);
    final availability = AssistanceAccountabilityAvailability.fromJson(
      map['availability'],
    );
    final disposition = assistanceEnum(
      AssistanceVisitDisposition.values,
      map['disposition'],
    );
    if (availability case AssistanceAccountabilityUnavailable(:final reason)) {
      final globalReason =
          reason == AssistanceAccountabilityUnavailableReason.notApplicable ||
          reason == AssistanceAccountabilityUnavailableReason.notCheckedIn;
      if ((scope.checkpoint == null && !globalReason) ||
          (scope.checkpoint != null &&
              reason ==
                  AssistanceAccountabilityUnavailableReason.notApplicable) ||
          (reason == AssistanceAccountabilityUnavailableReason.notCheckedIn &&
              disposition != AssistanceVisitDisposition.unresolved)) {
        throw const FormatException(
          'Inconsistent accountability availability.',
        );
      }
    }
    return EventAssistanceAccountabilityView._(
      scope: scope,
      sourceHash: assistanceHash(map['sourceHash']),
      serverTime: assistanceInteger(map['serverTime']),
      revision: assistanceInteger(map['revision']),
      episodeId: map['episodeId'] == null
          ? null
          : assistanceId(map['episodeId']),
      disposition: disposition,
      availability: availability,
    );
  }
}

final class EventAssistanceAccountabilityResult {
  const EventAssistanceAccountabilityResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceAccountabilityOutcome outcome;
  final int? operationRevision;
  final EventAssistanceAccountabilityView view;
  factory EventAssistanceAccountabilityResult.fromCallableData(
    Object? raw, {
    required EventAssistanceAccountabilityScope expectedScope,
  }) {
    final map = assistanceObject(raw, {'outcome', 'operationRevision', 'view'});
    final outcome = assistanceEnum(
      AssistanceAccountabilityOutcome.values,
      map['outcome'],
    );
    final revision = assistanceNullableInteger(map['operationRevision']);
    final view = EventAssistanceAccountabilityView._parse(
      map['view'],
      expectedScope,
    );
    if (outcome == AssistanceAccountabilityOutcome.read
        ? revision != null
        : revision == null || revision == 0 || revision > view.revision) {
      throw const FormatException('Invalid accountability receipt.');
    }
    return EventAssistanceAccountabilityResult._(outcome, revision, view);
  }
}
