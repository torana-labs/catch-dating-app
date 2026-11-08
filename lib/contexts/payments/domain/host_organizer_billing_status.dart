/// Where an organizer's free trial stands, computed by the server.
enum HostTrialState {
  notStarted,
  scheduled,
  active,
  ended,
  none,
  unconfigured;

  static HostTrialState fromWire(String value) => values.firstWhere(
    (state) => state.name == value,
    orElse: () => HostTrialState.unconfigured,
  );
}

/// The free trial as `getOrganizerBillingStatus` returns it. Status only: it
/// carries no prices, so the Host app can show it under App Store guideline
/// 3.1.3(f).
class HostTrialStatus {
  const HostTrialStatus({
    required this.state,
    required this.startsAt,
    required this.endsAt,
    required this.daysLeft,
  });

  factory HostTrialStatus.fromJson(Map<String, Object?> json) =>
      HostTrialStatus(
        state: HostTrialState.fromWire(json['state']! as String),
        startsAt: _dateOf(json['startsAtMillis']),
        endsAt: _dateOf(json['endsAtMillis']),
        daysLeft: json['daysLeft'] as int?,
      );

  final HostTrialState state;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? daysLeft;

  static DateTime? _dateOf(Object? millis) => millis == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(millis as int);
}

/// One organizer's billing status for its owner.
class HostOrganizerBillingStatus {
  const HostOrganizerBillingStatus({required this.trial});

  factory HostOrganizerBillingStatus.fromJson(Map<String, Object?> json) =>
      HostOrganizerBillingStatus(
        trial: HostTrialStatus.fromJson(
          Map<String, Object?>.from(json['trial']! as Map),
        ),
      );

  final HostTrialStatus trial;
}
