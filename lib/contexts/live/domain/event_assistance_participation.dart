/// A live operational attendee. Rehearsal has a separate execution boundary.
final class EventAssistanceGuestScope {
  EventAssistanceGuestScope({
    required this.organizerId,
    required this.eventId,
    required this.attendeeId,
  }) {
    _text(organizerId, 2000);
    _id(eventId);
    _id(attendeeId);
  }

  final String organizerId;
  final String eventId;
  final String attendeeId;

  Map<String, Object?> get context => {
    'mode': 'live',
    'eventId': eventId,
    'organizerId': organizerId,
  };

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGuestScope &&
      other.organizerId == organizerId &&
      other.eventId == eventId &&
      other.attendeeId == attendeeId;

  @override
  int get hashCode => Object.hash(organizerId, eventId, attendeeId);
}

/// Participation and attendance are independent facts. Only a break can carry
/// a planned return point; none of these commands checks a guest in.
sealed class EventAssistanceParticipation {
  const EventAssistanceParticipation();

  factory EventAssistanceParticipation.fromJson(Object? value) =>
      _participation(value) ??
      (throw const FormatException('Missing participation state.'));

  const factory EventAssistanceParticipation.active() =
      EventParticipationActive;
  const factory EventAssistanceParticipation.onBreak({String? resumeAtUnit}) =
      EventParticipationOnBreak;
  const factory EventAssistanceParticipation.departed() =
      EventParticipationDeparted;

  Map<String, Object?> toJson() => switch (this) {
    EventParticipationActive() => {'state': 'active', 'resumeAtUnit': null},
    EventParticipationOnBreak(:final resumeAtUnit) => {
      'state': 'temporaryBreak',
      'resumeAtUnit': resumeAtUnit,
    },
    EventParticipationDeparted() => {'state': 'departed', 'resumeAtUnit': null},
  };
}

final class EventParticipationActive extends EventAssistanceParticipation {
  const EventParticipationActive();
}

final class EventParticipationOnBreak extends EventAssistanceParticipation {
  const EventParticipationOnBreak({this.resumeAtUnit});

  final String? resumeAtUnit;
}

final class EventParticipationDeparted extends EventAssistanceParticipation {
  const EventParticipationDeparted();
}

enum EventParticipationFreshness { uninitialized, current, sourceChanged }

enum EventParticipationOutcome { read, applied, replayed }

typedef EventParticipationReturnPoint = ({String unitId, String label});

/// An authoritative snapshot, including the fences required by a later change.
final class EventAssistanceParticipationView {
  const EventAssistanceParticipationView._({
    required this.scope,
    required this.serverTime,
    required this.sourceHash,
    required this.revision,
    required this.episodeId,
    required this.freshness,
    required this.participation,
    required this.canChange,
    required this.checkedIn,
    required this.returnPoints,
  });

  final EventAssistanceGuestScope scope;
  final int serverTime;
  final String sourceHash;
  final int revision;
  final String? episodeId;
  final EventParticipationFreshness freshness;
  final EventAssistanceParticipation? participation;
  final bool canChange;
  final bool checkedIn;
  final List<EventParticipationReturnPoint> returnPoints;

  EventAssistanceParticipationChange prepareChange({
    required String operationId,
    required EventAssistanceParticipation participation,
  }) {
    _id(operationId);
    if (!canChange) throw StateError('Participation changes are unavailable.');
    if (participation case EventParticipationOnBreak(:final resumeAtUnit?)) {
      _id(resumeAtUnit);
      if (!returnPoints.any((point) => point.unitId == resumeAtUnit)) {
        throw ArgumentError('Choose a return point from this event snapshot.');
      }
    }
    return EventAssistanceParticipationChange._(
      snapshot: this,
      operationId: operationId,
      participation: participation,
    );
  }
}

/// Retain this exact value for transport retries. Re-reading and rebuilding a
/// command would silently substitute a newer revision for the host's decision.
final class EventAssistanceParticipationChange {
  const EventAssistanceParticipationChange._({
    required this.snapshot,
    required this.operationId,
    required this.participation,
  });

  final EventAssistanceParticipationView snapshot;
  final String operationId;
  final EventAssistanceParticipation participation;

  Map<String, Object?> get command => {
    'kind': 'setParticipation',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'attendeeId': snapshot.scope.attendeeId,
      ...participation.toJson(),
      'episodeId': snapshot.episodeId,
      'expectedParticipationRevision': snapshot.revision,
    },
  };
}

final class EventAssistanceParticipationResult {
  const EventAssistanceParticipationResult._({
    required this.outcome,
    required this.operationRevision,
    required this.view,
  });

  factory EventAssistanceParticipationResult.fromCallableData(
    Object? value, {
    required EventAssistanceGuestScope expectedScope,
  }) {
    final result = _map(value, {'outcome', 'operationRevision', 'view'});
    final outcome = _enum(EventParticipationOutcome.values, result['outcome']);
    final view = _map(result['view'], {
      'context',
      'attendeeId',
      'serverTime',
      'sourceHash',
      'freshness',
      'revision',
      'episodeId',
      'participation',
      'canChange',
      'checkedIn',
      'resumeUnits',
    });
    final context = _map(view['context'], {'mode', 'eventId', 'organizerId'});
    if (context['mode'] != 'live' ||
        context['eventId'] != expectedScope.eventId ||
        context['organizerId'] != expectedScope.organizerId ||
        view['attendeeId'] != expectedScope.attendeeId) {
      throw const FormatException('Participation response scope mismatch.');
    }
    final revision = _integer(view['revision']);
    final episodeId = view['episodeId'] == null ? null : _id(view['episodeId']);
    final freshness = _enum(
      EventParticipationFreshness.values,
      view['freshness'],
    );
    final participation = _participation(view['participation']);
    // Automatic enrollment starts at revision zero. Episode presence, rather
    // than a positive revision, distinguishes that record from no guest.
    final consistent = switch (freshness) {
      EventParticipationFreshness.uninitialized =>
        revision == 0 && episodeId == null && participation == null,
      EventParticipationFreshness.current =>
        episodeId != null && participation != null,
      EventParticipationFreshness.sourceChanged =>
        episodeId != null && participation == null,
    };
    final operationRevision = result['operationRevision'] == null
        ? null
        : _integer(result['operationRevision']);
    if (!consistent ||
        (outcome == EventParticipationOutcome.read
            ? operationRevision != null
            : operationRevision == null ||
                  operationRevision < 1 ||
                  operationRevision > revision)) {
      throw const FormatException('Inconsistent participation response.');
    }
    final units = view['resumeUnits'];
    if (units is! List || units.length > 40) {
      throw const FormatException('Invalid participation return points.');
    }
    final points = units
        .map((value) {
          final unit = _map(value, {'unitId', 'label'});
          return (
            unitId: _id(unit['unitId']),
            label: _text(unit['label'], 240),
          );
        })
        .toList(growable: false);
    if (points.map((point) => point.unitId).toSet().length != points.length) {
      throw const FormatException('Duplicate participation return point.');
    }
    return EventAssistanceParticipationResult._(
      outcome: outcome,
      operationRevision: operationRevision,
      view: EventAssistanceParticipationView._(
        scope: expectedScope,
        serverTime: _integer(view['serverTime']),
        sourceHash: _hash(view['sourceHash']),
        revision: revision,
        episodeId: episodeId,
        freshness: freshness,
        participation: participation,
        canChange: _boolean(view['canChange']),
        checkedIn: _boolean(view['checkedIn']),
        returnPoints: List.unmodifiable(points),
      ),
    );
  }

  final EventParticipationOutcome outcome;
  final int? operationRevision;
  final EventAssistanceParticipationView view;

  /// A successful write must confirm this decision. Replays retain the original
  /// receipt revision while showing any later authoritative participation.
  void requireChange(EventAssistanceParticipationChange change) {
    final before = change.snapshot;
    if (view.scope != before.scope ||
        outcome == EventParticipationOutcome.read ||
        operationRevision != before.revision + 1 ||
        view.revision < operationRevision!) {
      throw const FormatException('Invalid participation change receipt.');
    }
    if (outcome == EventParticipationOutcome.applied &&
        (view.revision != operationRevision ||
            view.sourceHash != before.sourceHash ||
            view.serverTime < before.serverTime ||
            view.freshness != EventParticipationFreshness.current ||
            view.checkedIn != before.checkedIn ||
            !_sameParticipation(view.participation, change.participation))) {
      throw const FormatException(
        'Participation result does not confirm the decision.',
      );
    }
  }
}

bool _sameParticipation(
  EventAssistanceParticipation? actual,
  EventAssistanceParticipation expected,
) => switch ((actual, expected)) {
  (EventParticipationActive(), EventParticipationActive()) ||
  (EventParticipationDeparted(), EventParticipationDeparted()) => true,
  (
    EventParticipationOnBreak(:final resumeAtUnit),
    EventParticipationOnBreak(resumeAtUnit: final expectedPoint),
  ) =>
    resumeAtUnit == expectedPoint,
  _ => false,
};

EventAssistanceParticipation? _participation(Object? value) {
  if (value == null) return null;
  final map = _map(value, {'state', 'resumeAtUnit'});
  final unit = map['resumeAtUnit'];
  return switch (map['state']) {
    'active' when unit == null => const EventAssistanceParticipation.active(),
    'departed' when unit == null =>
      const EventAssistanceParticipation.departed(),
    'temporaryBreak' => EventAssistanceParticipation.onBreak(
      resumeAtUnit: unit == null ? null : _id(unit),
    ),
    _ => throw const FormatException('Invalid participation state.'),
  };
}

Map<Object?, Object?> _map(Object? value, Set<String> keys) {
  if (value is Map<Object?, Object?> &&
      value.length == keys.length &&
      keys.every(value.containsKey)) {
    return value;
  }
  throw const FormatException('Invalid participation object.');
}

String _text(Object? value, int maxLength) {
  if (value is String && value.isNotEmpty && value.length <= maxLength) {
    return value;
  }
  throw const FormatException('Invalid participation text.');
}

String _id(Object? value) {
  final text = _text(value, 160);
  if (!RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]*$').hasMatch(text)) {
    throw const FormatException('Invalid participation identity.');
  }
  return text;
}

String _hash(Object? value) {
  if (value is String && RegExp(r'^[a-f0-9]{64}$').hasMatch(value)) {
    return value;
  }
  throw const FormatException('Invalid participation source.');
}

int _integer(Object? value) {
  if (value is num &&
      value.isFinite &&
      value >= 0 &&
      value <= 9007199254740991 &&
      value == value.truncateToDouble()) {
    return value.toInt();
  }
  throw const FormatException('Invalid participation revision or time.');
}

bool _boolean(Object? value) {
  if (value is bool) return value;
  throw const FormatException('Invalid participation flag.');
}

T _enum<T extends Enum>(List<T> values, Object? value) {
  for (final candidate in values) {
    if (candidate.name == value) return candidate;
  }
  throw const FormatException('Unknown participation state.');
}
