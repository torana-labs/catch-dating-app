import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';

/// Lifecycle of one member's paid membership with one organizer.
enum HostMembershipStatus {
  trialing('trialing'),
  active('active'),
  pastDue('past_due'),
  paused('paused'),
  canceling('canceling'),
  expired('expired');

  const HostMembershipStatus(this.wireValue);

  final String wireValue;

  static HostMembershipStatus fromWire(String value) =>
      membershipEnum(values, value, (status) => status.wireValue);
}

enum HostMembershipInterval {
  monthly,
  annual;

  static HostMembershipInterval fromWire(String value) =>
      membershipEnum(values, value, (interval) => interval.name);
}

enum HostMembershipPauseInitiator { member, host }

/// Self-serve actions the server accepts for one membership status.
enum HostMembershipAction { pause, resume, cancelAtPeriodEnd }

/// A member's own `hostMemberships/{id}` document.
class HostMembership {
  const HostMembership({
    required this.id,
    required this.organizerId,
    required this.uid,
    required this.planId,
    required this.planName,
    required this.interval,
    required this.status,
    required this.priceInPaise,
    required this.currentPeriodEnd,
    required this.trialEndsAt,
    required this.cancelAtPeriodEnd,
    required this.pauseInitiator,
    required this.memberSince,
    required this.accumulatedTenure,
    required this.tenureStretchStartedAt,
  });

  factory HostMembership.fromMap(String id, Map<Object?, Object?> map) {
    final pause = map['pause'];
    final tenure = membershipMap(map['tenure'], 'tenure');
    return HostMembership(
      id: id,
      organizerId: membershipString(map, 'organizerId'),
      uid: membershipString(map, 'uid'),
      planId: membershipString(map, 'planId'),
      planName: membershipString(map, 'planName'),
      interval: HostMembershipInterval.fromWire(
        membershipString(map, 'interval'),
      ),
      status: HostMembershipStatus.fromWire(membershipString(map, 'status')),
      priceInPaise: membershipInt(map, 'priceInPaise'),
      currentPeriodEnd: membershipDateTime(map, 'currentPeriodEndMillis'),
      trialEndsAt: membershipDateTime(map, 'trialEndsAtMillis'),
      cancelAtPeriodEnd: membershipBool(map, 'cancelAtPeriodEnd'),
      pauseInitiator: pause == null
          ? null
          : membershipEnum(
              HostMembershipPauseInitiator.values,
              membershipString(membershipMap(pause, 'pause'), 'initiator'),
              (initiator) => initiator.name,
            ),
      memberSince: membershipDateTime(map, 'memberSinceMillis'),
      accumulatedTenure: Duration(
        milliseconds: membershipInt(tenure, 'accumulatedMillis'),
      ),
      tenureStretchStartedAt: membershipDateTime(
        tenure,
        'stretchStartedAtMillis',
      ),
    );
  }

  final String id;
  final String organizerId;
  final String uid;
  final String planId;
  final String planName;
  final HostMembershipInterval interval;
  final HostMembershipStatus status;
  final int priceInPaise;
  final DateTime? currentPeriodEnd;
  final DateTime? trialEndsAt;
  final bool cancelAtPeriodEnd;
  final HostMembershipPauseInitiator? pauseInitiator;
  final DateTime? memberSince;
  final Duration accumulatedTenure;
  final DateTime? tenureStretchStartedAt;

  /// Members keep their badge while paused; only expiry ends membership.
  bool get isCurrent => status != HostMembershipStatus.expired;

  bool get pausedByHost =>
      status == HostMembershipStatus.paused &&
      pauseInitiator == HostMembershipPauseInitiator.host;

  /// Cumulative membership time across pauses and rejoins.
  Duration tenureAt(DateTime now) {
    final stretch = tenureStretchStartedAt;
    if (stretch == null || now.isBefore(stretch)) return accumulatedTenure;
    return accumulatedTenure + now.difference(stretch);
  }

  /// Mirrors the server's self-serve gates so the UI only offers valid moves.
  Set<HostMembershipAction> get availableActions => switch (status) {
    HostMembershipStatus.active => {
      HostMembershipAction.pause,
      HostMembershipAction.cancelAtPeriodEnd,
    },
    HostMembershipStatus.trialing ||
    HostMembershipStatus.pastDue => {HostMembershipAction.cancelAtPeriodEnd},
    HostMembershipStatus.paused =>
      pausedByHost ? const {} : {HostMembershipAction.resume},
    HostMembershipStatus.canceling || HostMembershipStatus.expired => const {},
  };
}
