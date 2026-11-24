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

  /// The trial from a `hostOrganizerBillingViews` trial (#2306) at [now],
  /// exactly as the server's `computeTrialStatus` derives it: [days] null
  /// means Catch's terms are unset, no start means it has not started, and
  /// the days left round up while it is scheduled or running.
  factory HostTrialStatus.fromView(Map<Object?, Object?> trial, DateTime now) {
    final days = trial['days'] as int?;
    final startsAt = _dateOf(trial['startsAtMillis']);
    final endsAt = _dateOf(trial['endsAtMillis']);
    HostTrialStatus status(HostTrialState state, [int? daysLeft]) =>
        HostTrialStatus(
          state: state,
          startsAt: startsAt,
          endsAt: endsAt,
          daysLeft: daysLeft,
        );
    if (days == null) {
      return const HostTrialStatus(
        state: HostTrialState.unconfigured,
        startsAt: null,
        endsAt: null,
        daysLeft: null,
      );
    }
    if (startsAt == null || endsAt == null) {
      return status(days > 0 ? HostTrialState.notStarted : HostTrialState.none);
    }
    if (days <= 0) return status(HostTrialState.none);
    if (!now.isBefore(endsAt)) return status(HostTrialState.ended);
    final from = now.isAfter(startsAt) ? now : startsAt;
    final daysLeft = (endsAt.difference(from).inMilliseconds / _dayMillis)
        .ceil();
    return status(
      now.isBefore(startsAt) ? HostTrialState.scheduled : HostTrialState.active,
      daysLeft,
    );
  }

  static const _dayMillis = 24 * 60 * 60 * 1000;

  final HostTrialState state;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? daysLeft;

  /// When this status next changes by time alone: the trial starting, its
  /// days left ticking down, or it ending. Null when nothing will.
  DateTime? nextChangeAfter(DateTime now) {
    final start = startsAt;
    final end = endsAt;
    final left = daysLeft;
    if (start == null || end == null || left == null) return null;
    if (state == HostTrialState.scheduled) return start;
    if (state != HostTrialState.active) return null;
    final next = end.subtract(Duration(milliseconds: (left - 1) * _dayMillis));
    return next.isAfter(now) ? next : end;
  }

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

  /// The status from a `hostOrganizerBillingViews` document (#2306) at
  /// [now]: the trial derived from its facts, the plan as stored.
  factory HostOrganizerBillingStatus.fromView(
    Map<Object?, Object?> view,
    DateTime now,
  ) {
    final trial = view['trial'];
    final plan = view['plan'];
    if (view['version'] != 1 || trial is! Map || plan is! Map) {
      throw const FormatException('Invalid organizer billing view.');
    }
    return HostOrganizerBillingStatus(
      trial: HostTrialStatus.fromView(trial, now),
      plan: HostPlanStatus.fromJson(Map<String, Object?>.from(plan)),
    );
  }

  final HostTrialStatus trial;
  final HostPlanStatus plan;
}
