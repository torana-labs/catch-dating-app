enum EventSuccessPresenceState { present, idle, likelyDeparted }

enum EventSuccessLateArrivalStatus {
  insertedIntoOpenPair,
  extendedUnit,
  heldForNextRound,
}

final class EventSuccessPresencePolicy {
  const EventSuccessPresencePolicy({
    required this.heartbeatIntervalSeconds,
    required this.presentWindowSeconds,
    required this.likelyDepartedAfterSeconds,
  });

  final int heartbeatIntervalSeconds;
  final int presentWindowSeconds;
  final int likelyDepartedAfterSeconds;

  factory EventSuccessPresencePolicy.fromJson(Map<String, dynamic> json) =>
      EventSuccessPresencePolicy(
        heartbeatIntervalSeconds: _requiredNonNegativeInt(
          json,
          'heartbeatIntervalSeconds',
        ),
        presentWindowSeconds: _requiredNonNegativeInt(
          json,
          'presentWindowSeconds',
        ),
        likelyDepartedAfterSeconds: _requiredNonNegativeInt(
          json,
          'likelyDepartedAfterSeconds',
        ),
      );
}

final class EventSuccessPresenceHeartbeat {
  const EventSuccessPresenceHeartbeat({
    required this.serverTimeMillis,
    required this.policy,
  });

  factory EventSuccessPresenceHeartbeat.fromJson(Map<String, dynamic> json) =>
      EventSuccessPresenceHeartbeat(
        serverTimeMillis: _requiredNonNegativeInt(json, 'serverTimeMillis'),
        policy: EventSuccessPresencePolicy.fromJson(json),
      );

  final int serverTimeMillis;
  final EventSuccessPresencePolicy policy;
}

final class EventSuccessPresenceEntry {
  const EventSuccessPresenceEntry({
    required this.uid,
    required this.displayName,
    required this.state,
    required this.heartbeatAtMillis,
  });

  factory EventSuccessPresenceEntry.fromJson(Map<String, dynamic> json) =>
      EventSuccessPresenceEntry(
        uid: _requiredString(json, 'uid'),
        displayName: _requiredString(json, 'displayName'),
        state: EventSuccessPresenceState.values.byName(
          _requiredString(json, 'presenceState'),
        ),
        heartbeatAtMillis: _requiredNonNegativeInt(json, 'heartbeatAtMillis'),
      );

  final String uid;
  final String displayName;
  final EventSuccessPresenceState state;
  final int heartbeatAtMillis;
}

final class EventSuccessLateArrivalCandidate {
  const EventSuccessLateArrivalCandidate({
    required this.uid,
    required this.displayName,
    required this.checkedInAtMillis,
  });

  factory EventSuccessLateArrivalCandidate.fromJson(
    Map<String, dynamic> json,
  ) => EventSuccessLateArrivalCandidate(
    uid: _requiredString(json, 'uid'),
    displayName: _requiredString(json, 'displayName'),
    checkedInAtMillis: _requiredNonNegativeInt(json, 'checkedInAtMillis'),
  );

  final String uid;
  final String displayName;
  final int checkedInAtMillis;
}

final class EventSuccessPresenceSummary {
  const EventSuccessPresenceSummary({
    required this.serverTimeMillis,
    required this.liveControlRevision,
    required this.nextRoundIndex,
    required this.policy,
    required this.entries,
    required this.lateArrivals,
  });

  factory EventSuccessPresenceSummary.fromJson(Map<String, dynamic> json) =>
      EventSuccessPresenceSummary(
        serverTimeMillis: _requiredNonNegativeInt(json, 'serverTimeMillis'),
        liveControlRevision: _requiredNonNegativeInt(
          json,
          'liveControlRevision',
        ),
        nextRoundIndex: _requiredNonNegativeInt(json, 'nextRoundIndex'),
        policy: EventSuccessPresencePolicy.fromJson(
          Map<String, dynamic>.from(json['policy'] as Map),
        ),
        entries: _objectList(
          json['entries'],
        ).map(EventSuccessPresenceEntry.fromJson).toList(growable: false),
        lateArrivals: _objectList(json['lateArrivals'])
            .map(EventSuccessLateArrivalCandidate.fromJson)
            .toList(growable: false),
      );

  final int serverTimeMillis;
  final int liveControlRevision;
  final int nextRoundIndex;
  final EventSuccessPresencePolicy policy;
  final List<EventSuccessPresenceEntry> entries;
  final List<EventSuccessLateArrivalCandidate> lateArrivals;

  List<EventSuccessPresenceEntry> get likelyDeparted => entries
      .where((entry) => entry.state == EventSuccessPresenceState.likelyDeparted)
      .toList(growable: false);
}

final class EventSuccessLateArrivalResolution {
  const EventSuccessLateArrivalResolution({
    required this.status,
    required this.targetRoundIndex,
    required this.assignmentDraftRevision,
    required this.reason,
  });

  factory EventSuccessLateArrivalResolution.fromJson(
    Map<String, dynamic> json,
  ) => EventSuccessLateArrivalResolution(
    status: EventSuccessLateArrivalStatus.values.byName(
      _requiredString(json, 'status'),
    ),
    targetRoundIndex: _requiredNonNegativeInt(json, 'targetRoundIndex'),
    assignmentDraftRevision: _requiredNonNegativeInt(
      json,
      'assignmentDraftRevision',
    ),
    reason: _requiredString(json, 'reason'),
  );

  final EventSuccessLateArrivalStatus status;
  final int targetRoundIndex;
  final int assignmentDraftRevision;
  final String reason;
}

List<Map<String, dynamic>> _objectList(Object? value) => value is List
    ? value
          .whereType<Map>()
          .map(Map<String, dynamic>.from)
          .toList(growable: false)
    : const [];

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('$key must be a non-empty string.');
}

int _requiredNonNegativeInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int && value >= 0) return value;
  throw FormatException('$key must be a non-negative integer.');
}
