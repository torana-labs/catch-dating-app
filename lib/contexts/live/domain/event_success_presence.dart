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

  final String uid;
  final String displayName;
  final int checkedInAtMillis;
}

/// The room's presence and late arrivals as a manager's phone derives them
/// from its listeners and its own clock.
final class EventSuccessPresenceSummary {
  const EventSuccessPresenceSummary({
    required this.liveControlRevision,
    required this.nextRoundIndex,
    required this.policy,
    required this.entries,
    required this.lateArrivals,
  });

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
