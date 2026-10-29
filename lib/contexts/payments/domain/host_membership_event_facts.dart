import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';

/// A membership that would make one event cheaper or bookable.
class HostMembershipEventOffer {
  const HostMembershipEventOffer({
    required this.planId,
    required this.planName,
    required this.interval,
    required this.planPriceInPaise,
    required this.memberPriceInPaise,
    required this.savingsInPaise,
    required this.unlocksAccess,
  });

  factory HostMembershipEventOffer.fromMap(Map<Object?, Object?> map) =>
      HostMembershipEventOffer(
        planId: membershipString(map, 'planId'),
        planName: membershipString(map, 'planName'),
        interval: HostMembershipInterval.fromWire(
          membershipString(map, 'interval'),
        ),
        planPriceInPaise: membershipInt(map, 'planPriceInPaise'),
        memberPriceInPaise: membershipInt(map, 'memberPriceInPaise'),
        savingsInPaise: membershipInt(map, 'savingsInPaise'),
        unlocksAccess: membershipBool(map, 'unlocksAccess'),
      );

  final String planId;
  final String planName;
  final HostMembershipInterval interval;
  final int planPriceInPaise;
  final int memberPriceInPaise;
  final int savingsInPaise;

  /// Members-only or early access would let the viewer book at all.
  final bool unlocksAccess;

  bool get makesEventFree => memberPriceInPaise == 0 && !unlocksAccess;
}

/// Server-evaluated membership facts for one viewer and event, from the
/// opt-in `hostMembership` object of `getEventViewerState`.
class EventHostMembershipFacts {
  const EventHostMembershipFacts({
    required this.memberPlanName,
    required this.memberStatus,
    required this.entitled,
    required this.listPriceInPaise,
    required this.memberPriceApplied,
    required this.bookingCapReached,
    required this.savingsInPaise,
    required this.membersOnly,
    required this.generalSaleOpensAt,
    required this.offer,
  });

  static const keys = {
    'member',
    'listPriceInPaise',
    'memberPriceApplied',
    'memberPriceBlockedReason',
    'savingsInPaise',
    'membersOnly',
    'generalSaleOpensAtMillis',
    'offer',
  };

  factory EventHostMembershipFacts.fromMap(Map<Object?, Object?> map) {
    if (map.length != keys.length || !keys.every(map.containsKey)) {
      throw const FormatException('Invalid event membership facts.');
    }
    final member = map['member'] == null
        ? null
        : membershipMap(map['member'], 'member');
    final blocked = membershipNullableString(map, 'memberPriceBlockedReason');
    if (blocked != null && blocked != 'bookingCapReached') {
      throw const FormatException('Invalid member price reason.');
    }
    return EventHostMembershipFacts(
      memberPlanName: member == null
          ? null
          : membershipString(member, 'planName'),
      memberStatus: member == null
          ? null
          : HostMembershipStatus.fromWire(membershipString(member, 'status')),
      entitled: member != null && membershipBool(member, 'entitled'),
      listPriceInPaise: membershipNullableInt(map, 'listPriceInPaise'),
      memberPriceApplied: membershipBool(map, 'memberPriceApplied'),
      bookingCapReached: blocked != null,
      savingsInPaise: membershipInt(map, 'savingsInPaise'),
      membersOnly: membershipBool(map, 'membersOnly'),
      generalSaleOpensAt: membershipDateTime(map, 'generalSaleOpensAtMillis'),
      offer: map['offer'] == null
          ? null
          : HostMembershipEventOffer.fromMap(
              membershipMap(map['offer'], 'offer'),
            ),
    );
  }

  final String? memberPlanName;
  final HostMembershipStatus? memberStatus;
  final bool entitled;
  final int? listPriceInPaise;
  final bool memberPriceApplied;
  final bool bookingCapReached;
  final int savingsInPaise;
  final bool membersOnly;
  final DateTime? generalSaleOpensAt;
  final HostMembershipEventOffer? offer;
}
