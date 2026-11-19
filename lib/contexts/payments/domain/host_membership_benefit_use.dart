import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';

/// One booking a member made at a member price.
class HostMembershipBenefitUse {
  const HostMembershipBenefitUse({
    required this.id,
    required this.membershipId,
    required this.organizerId,
    required this.eventId,
    required this.listPriceInPaise,
    required this.paidPriceInPaise,
    required this.savingsInPaise,
    required this.released,
  });

  factory HostMembershipBenefitUse.fromMap(
    String id,
    Map<Object?, Object?> map,
  ) => HostMembershipBenefitUse(
    id: id,
    membershipId: membershipString(map, 'membershipId'),
    organizerId: membershipString(map, 'organizerId'),
    eventId: membershipString(map, 'eventId'),
    listPriceInPaise: membershipInt(map, 'listPriceInPaise'),
    paidPriceInPaise: membershipInt(map, 'paidPriceInPaise'),
    savingsInPaise: membershipInt(map, 'savingsInPaise'),
    released: membershipString(map, 'state') == releasedState,
  );

  /// Wire values of the use's `state`.
  static const bookedState = 'booked';
  static const releasedState = 'released';

  final String id;
  final String membershipId;
  final String organizerId;
  final String eventId;
  final int listPriceInPaise;
  final int paidPriceInPaise;
  final int savingsInPaise;

  /// The booking was cancelled, so it saved the member nothing.
  final bool released;
}
