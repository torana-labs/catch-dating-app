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

/// Which Catch plan the organizer is on, as status only: never a price.
enum HostPlanKind { ticketing, toolsOnly }

/// Where the plan stands; tools-only is bought and paid on the web only.
enum HostPlanState {
  none,
  pendingPayment,
  active,
  ended;

  static HostPlanState fromWire(Object? value) => values.firstWhere(
    (state) => state.name == value,
    orElse: () => HostPlanState.none,
  );
}

/// The plan as `getOrganizerBillingStatus` returns it.
class HostPlanStatus {
  const HostPlanStatus({
    required this.kind,
    required this.state,
    required this.startsAt,
    required this.endsAt,
  });

  factory HostPlanStatus.fromJson(Map<String, Object?>? json) => HostPlanStatus(
    kind: json?['plan'] == 'toolsOnly'
        ? HostPlanKind.toolsOnly
        : HostPlanKind.ticketing,
    state: HostPlanState.fromWire(json?['status']),
    startsAt: HostTrialStatus._dateOf(json?['startsAtMillis']),
    endsAt: HostTrialStatus._dateOf(json?['endsAtMillis']),
  );

  /// Ticketing by default, before any plan change.
  static const ticketing = HostPlanStatus(
    kind: HostPlanKind.ticketing,
    state: HostPlanState.none,
    startsAt: null,
    endsAt: null,
  );

  final HostPlanKind kind;
  final HostPlanState state;
  final DateTime? startsAt;
  final DateTime? endsAt;
}

/// One organizer's billing status for its owner.
class HostOrganizerBillingStatus {
  const HostOrganizerBillingStatus({
    required this.trial,
    this.plan = HostPlanStatus.ticketing,
  });

  factory HostOrganizerBillingStatus.fromJson(Map<String, Object?> json) =>
      HostOrganizerBillingStatus(
        trial: HostTrialStatus.fromJson(
          Map<String, Object?>.from(json['trial']! as Map),
        ),
        // A server from before plans sends none: ticketing.
        plan: HostPlanStatus.fromJson(
          json['plan'] == null
              ? null
              : Map<String, Object?>.from(json['plan']! as Map),
        ),
      );

  final HostTrialStatus trial;
  final HostPlanStatus plan;
}
