import 'package:catch_dating_app/host_memberships/domain/host_membership_fields.dart';

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
    released: membershipString(map, 'state') == 'released',
  );

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

/// Price members would otherwise have paid, minus what they paid.
int hostMembershipSavingsInPaise(
  Iterable<HostMembershipBenefitUse> uses, {
  String? membershipId,
}) => uses
    .where(
      (use) =>
          !use.released &&
          (membershipId == null || use.membershipId == membershipId),
    )
    .fold(0, (total, use) => total + use.savingsInPaise);
