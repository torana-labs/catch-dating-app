import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';

/// One ordered selection, never an event-wide completeness claim.
final class EventAssistanceGuestSelection {
  EventAssistanceGuestSelection({
    required this.organizerId,
    required this.eventId,
    required Iterable<String> attendeeIds,
  }) : attendeeIds = List.unmodifiable(attendeeIds) {
    assistanceId(organizerId);
    assistanceId(eventId);
    if (this.attendeeIds.isEmpty ||
        this.attendeeIds.length > 50 ||
        this.attendeeIds.toSet().length != this.attendeeIds.length) {
      throw const FormatException('Choose 1–50 unique assistance guests.');
    }
    for (final id in this.attendeeIds) {
      assistanceId(id);
    }
  }

  final String organizerId;
  final String eventId;
  final List<String> attendeeIds;

  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };

  EventAssistanceGuestScope scopeFor(String attendeeId) {
    if (!attendeeIds.contains(attendeeId)) {
      throw ArgumentError('The guest is outside this selection.');
    }
    return EventAssistanceGuestScope(
      organizerId: organizerId,
      eventId: eventId,
      attendeeId: attendeeId,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGuestSelection &&
      other.organizerId == organizerId &&
      other.eventId == eventId &&
      other.attendeeIds.length == attendeeIds.length &&
      Iterable.generate(
        attendeeIds.length,
      ).every((index) => other.attendeeIds[index] == attendeeIds[index]);

  @override
  int get hashCode =>
      Object.hash(organizerId, eventId, Object.hashAll(attendeeIds));
}

enum AssistanceRuntimeStatus {
  unconfigured,
  paused,
  sourceChanged,
  expired,
  eventClosed,
  configured,
}

enum AssistanceRunStatus { running, paused, completed }

enum AssistanceConfigurationBinding { current, unbound, configurationChanged }

enum AssistanceIneligibleStatus { invited, waitlisted, cancelled }

final class AssistanceRecordedEvaluation {
  const AssistanceRecordedEvaluation({
    required this.at,
    required this.observation,
  });
  final int at;
  final AssistanceLiveObservation observation;
}

sealed class AssistanceGuestWork {
  const AssistanceGuestWork();

  factory AssistanceGuestWork.fromJson(
    Object? value, {
    required int serverTime,
  }) {
    final map = assistanceObject(value);
    if (map['kind'] == 'notEnrolled') {
      assistanceObject(map, {'kind'});
      return const AssistanceGuestNotEnrolled();
    }
    if (map['kind'] != 'recorded') {
      throw const FormatException('Unknown assistance work state.');
    }
    assistanceObject(map, {
      'kind',
      'revision',
      'runStatus',
      'configurationBinding',
      'expiresAt',
      'nextEvaluationAt',
      'lastEvaluation',
      'publishedIntentCount',
    });
    final revision = assistanceInteger(map['revision']);
    final runStatus = assistanceEnum(
      AssistanceRunStatus.values,
      map['runStatus'],
    );
    final expiresAt = assistanceInteger(map['expiresAt']);
    final dueAt = assistanceNullableInteger(map['nextEvaluationAt']);
    final published = assistanceInteger(map['publishedIntentCount']);
    AssistanceRecordedEvaluation? evaluation;
    if (map['lastEvaluation'] case final Object value) {
      final raw = assistanceObject(value, {'at', 'observation'});
      evaluation = AssistanceRecordedEvaluation(
        at: assistanceInteger(raw['at']),
        observation: AssistanceLiveObservation.fromJson(raw['observation']),
      );
    }
    final terminal = evaluation?.observation.isTerminal ?? false;
    if ((dueAt == null) != terminal ||
        (runStatus == AssistanceRunStatus.completed) != terminal ||
        (dueAt != null && dueAt > expiresAt) ||
        (evaluation != null && (evaluation.at > serverTime || revision == 0)) ||
        (evaluation == null && published != 0)) {
      throw const FormatException('Inconsistent assistance work snapshot.');
    }
    return AssistanceRecordedGuestWork(
      revision: revision,
      runStatus: runStatus,
      configurationBinding: assistanceEnum(
        AssistanceConfigurationBinding.values,
        map['configurationBinding'],
      ),
      expiresAt: expiresAt,
      nextEvaluationAt: dueAt,
      lastEvaluation: evaluation,
      publishedIntentCount: published,
    );
  }
}

final class AssistanceGuestNotEnrolled extends AssistanceGuestWork {
  const AssistanceGuestNotEnrolled();
}

final class AssistanceRecordedGuestWork extends AssistanceGuestWork {
  const AssistanceRecordedGuestWork({
    required this.revision,
    required this.runStatus,
    required this.configurationBinding,
    required this.expiresAt,
    required this.nextEvaluationAt,
    required this.lastEvaluation,
    required this.publishedIntentCount,
  });
  final int revision;
  final AssistanceRunStatus runStatus;
  final AssistanceConfigurationBinding configurationBinding;
  final int expiresAt;
  final int? nextEvaluationAt;
  final AssistanceRecordedEvaluation? lastEvaluation;

  /// Message intents only. Provider delivery is outside this projection.
  final int publishedIntentCount;
}

sealed class AssistanceHostGuest {
  const AssistanceHostGuest(this.scope);
  final EventAssistanceGuestScope scope;
  String get attendeeId => scope.attendeeId;
}

final class AssistanceGuestUnavailable extends AssistanceHostGuest {
  const AssistanceGuestUnavailable(super.scope);
}

final class AssistanceGuestIneligible extends AssistanceHostGuest {
  const AssistanceGuestIneligible(super.scope, this.rosterStatus);
  final AssistanceIneligibleStatus rosterStatus;
}

final class AssistanceGuestUninitialized extends AssistanceHostGuest {
  const AssistanceGuestUninitialized(super.scope, {required this.checkedIn});
  final bool checkedIn;
}

final class AssistanceGuestSourceChanged extends AssistanceHostGuest {
  const AssistanceGuestSourceChanged(super.scope, {required this.checkedIn});
  final bool checkedIn;
}

final class AssistanceCurrentGuest extends AssistanceHostGuest {
  const AssistanceCurrentGuest(
    super.scope, {
    required this.checkedIn,
    required this.episodeId,
    required this.participation,
    required this.intention,
    required this.work,
  });
  final bool checkedIn;
  final String episodeId;
  final EventAssistanceParticipation participation;
  final AssistanceJoiningIntention intention;
  final AssistanceGuestWork work;
}

final class EventAssistanceHostGuestsView {
  const EventAssistanceHostGuestsView._({
    required this.selection,
    required this.serverTime,
    required this.runtimeStatus,
    required this.guests,
  });

  factory EventAssistanceHostGuestsView.fromCallableData(
    Object? value, {
    required EventAssistanceGuestSelection expectedSelection,
  }) {
    final map = assistanceObject(value, {
      'context',
      'serverTime',
      'coverage',
      'workflow',
      'runtimeStatus',
      'guests',
    });
    final context = assistanceObject(map['context'], {
      'mode',
      'organizerId',
      'eventId',
    });
    if (context['mode'] != 'live' ||
        context['organizerId'] != expectedSelection.organizerId ||
        context['eventId'] != expectedSelection.eventId ||
        map['coverage'] != 'selectedAttendees' ||
        map['workflow'] != 'lateJoin') {
      throw const FormatException('Assistance response scope mismatch.');
    }
    final serverTime = assistanceInteger(map['serverTime']);
    final rows = map['guests'];
    if (rows is! List || rows.length != expectedSelection.attendeeIds.length) {
      throw const FormatException('Incomplete assistance guest selection.');
    }
    final guests = <AssistanceHostGuest>[];
    for (var index = 0; index < rows.length; index++) {
      final row = assistanceObject(rows[index]);
      if (row['attendeeId'] != expectedSelection.attendeeIds[index]) {
        throw const FormatException('Assistance guest selection mismatch.');
      }
      guests.add(
        _readGuest(
          row,
          expectedSelection.scopeFor(expectedSelection.attendeeIds[index]),
          serverTime,
        ),
      );
    }
    return EventAssistanceHostGuestsView._(
      selection: expectedSelection,
      serverTime: serverTime,
      runtimeStatus: assistanceEnum(
        AssistanceRuntimeStatus.values,
        map['runtimeStatus'],
      ),
      guests: List.unmodifiable(guests),
    );
  }

  final EventAssistanceGuestSelection selection;
  final int serverTime;
  final AssistanceRuntimeStatus runtimeStatus;
  final List<AssistanceHostGuest> guests;
}

AssistanceHostGuest _readGuest(
  Map<Object?, Object?> map,
  EventAssistanceGuestScope scope,
  int serverTime,
) {
  switch (map['kind']) {
    case 'unavailable':
      assistanceObject(map, {'kind', 'attendeeId'});
      return AssistanceGuestUnavailable(scope);
    case 'ineligible':
      assistanceObject(map, {'kind', 'attendeeId', 'rosterStatus'});
      return AssistanceGuestIneligible(
        scope,
        assistanceEnum(AssistanceIneligibleStatus.values, map['rosterStatus']),
      );
    case 'uninitialized':
      assistanceObject(map, {'kind', 'attendeeId', 'checkedIn'});
      return AssistanceGuestUninitialized(
        scope,
        checkedIn: assistanceBoolean(map['checkedIn']),
      );
    case 'sourceChanged':
      assistanceObject(map, {'kind', 'attendeeId', 'checkedIn'});
      return AssistanceGuestSourceChanged(
        scope,
        checkedIn: assistanceBoolean(map['checkedIn']),
      );
    case 'current':
      assistanceObject(map, {
        'kind',
        'attendeeId',
        'checkedIn',
        'episodeId',
        'participation',
        'intention',
        'work',
      });
      return AssistanceCurrentGuest(
        scope,
        checkedIn: assistanceBoolean(map['checkedIn']),
        episodeId: assistanceId(map['episodeId']),
        participation: EventAssistanceParticipation.fromJson(
          map['participation'],
        ),
        intention: AssistanceJoiningIntention.fromJson(map['intention']),
        work: AssistanceGuestWork.fromJson(map['work'], serverTime: serverTime),
      );
    default:
      throw const FormatException('Unknown assistance guest state.');
  }
}
