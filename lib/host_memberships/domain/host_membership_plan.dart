import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_fields.dart';

enum HostMembershipPlanStatus {
  draft,
  published,
  archived;

  static HostMembershipPlanStatus fromWire(String value) =>
      membershipEnum(values, value, (status) => status.name);
}

/// Enforced plan benefits; free-text perks are fulfilled by the host.
sealed class HostMembershipBenefit {
  const HostMembershipBenefit();

  factory HostMembershipBenefit.fromMap(Map<Object?, Object?> map) =>
      switch (membershipString(map, 'type')) {
        'eventDiscount' => HostMembershipEventDiscount(
          membershipInt(map, 'percentOff'),
        ),
        'earlyAccess' => const HostMembershipEarlyAccess(),
        'membersOnlyAccess' => const HostMembershipMembersOnlyAccess(),
        final type => throw FormatException('Unknown benefit $type.'),
      };

  Map<String, Object?> toPayload();
}

class HostMembershipEventDiscount extends HostMembershipBenefit {
  const HostMembershipEventDiscount(this.percentOff);

  final int percentOff;

  bool get includesEvents => percentOff == 100;

  @override
  Map<String, Object?> toPayload() => {
    'type': 'eventDiscount',
    'percentOff': percentOff,
  };

  @override
  bool operator ==(Object other) =>
      other is HostMembershipEventDiscount && other.percentOff == percentOff;

  @override
  int get hashCode => percentOff.hashCode;
}

class HostMembershipEarlyAccess extends HostMembershipBenefit {
  const HostMembershipEarlyAccess();

  @override
  Map<String, Object?> toPayload() => {'type': 'earlyAccess'};

  @override
  bool operator ==(Object other) => other is HostMembershipEarlyAccess;

  @override
  int get hashCode => 1;
}

class HostMembershipMembersOnlyAccess extends HostMembershipBenefit {
  const HostMembershipMembersOnlyAccess();

  @override
  Map<String, Object?> toPayload() => {'type': 'membersOnlyAccess'};

  @override
  bool operator ==(Object other) => other is HostMembershipMembersOnlyAccess;

  @override
  int get hashCode => 2;
}

/// One membership tier: a published `hostMembershipPlans` document or the
/// managers' plan view. Provider price ids never reach clients' logic.
class HostMembershipPlan {
  const HostMembershipPlan({
    required this.id,
    required this.organizerId,
    required this.name,
    required this.description,
    required this.status,
    required this.monthlyPriceInPaise,
    required this.annualPriceInPaise,
    required this.memberCap,
    required this.activeMemberCount,
    required this.trialDays,
    required this.benefits,
    required this.perks,
    required this.maxUpcomingMemberPricedBookings,
    required this.sortOrder,
    required this.revision,
  });

  factory HostMembershipPlan.fromMap(String id, Map<Object?, Object?> map) {
    final prices = membershipMap(map['prices'], 'prices');
    int? price(String interval) => prices[interval] == null
        ? null
        : membershipInt(
            membershipMap(prices[interval], interval),
            'amountPaise',
          );
    final benefits = map['benefits'];
    final perks = map['perks'];
    if (benefits is! List<Object?> || perks is! List<Object?>) {
      throw const FormatException('Invalid plan benefits.');
    }
    return HostMembershipPlan(
      id: id,
      organizerId: membershipString(map, 'organizerId'),
      name: membershipString(map, 'name'),
      description: map['description'] is String
          ? map['description']! as String
          : '',
      status: HostMembershipPlanStatus.fromWire(
        membershipString(map, 'status'),
      ),
      monthlyPriceInPaise: price('monthly'),
      annualPriceInPaise: price('annual'),
      memberCap: membershipNullableInt(map, 'memberCap'),
      activeMemberCount: membershipInt(map, 'activeMemberCount'),
      trialDays: membershipInt(map, 'trialDays'),
      benefits: List.unmodifiable(
        benefits.map(
          (item) =>
              HostMembershipBenefit.fromMap(membershipMap(item, 'benefit')),
        ),
      ),
      perks: List.unmodifiable(perks.whereType<String>()),
      maxUpcomingMemberPricedBookings: membershipNullableInt(
        membershipMap(map['limits'], 'limits'),
        'maxUpcomingMemberPricedBookings',
      ),
      sortOrder: membershipInt(map, 'sortOrder'),
      revision: membershipInt(map, 'revision'),
    );
  }

  final String id;
  final String organizerId;
  final String name;
  final String description;
  final HostMembershipPlanStatus status;
  final int? monthlyPriceInPaise;
  final int? annualPriceInPaise;
  final int? memberCap;
  final int activeMemberCount;
  final int trialDays;
  final List<HostMembershipBenefit> benefits;
  final List<String> perks;
  final int? maxUpcomingMemberPricedBookings;
  final int sortOrder;
  final int revision;

  bool get isFull => memberCap != null && activeMemberCount >= memberCap!;

  HostMembershipEventDiscount? get eventDiscount =>
      benefits.whereType<HostMembershipEventDiscount>().firstOrNull;

  bool get hasEarlyAccess =>
      benefits.any((benefit) => benefit is HostMembershipEarlyAccess);

  bool get hasMembersOnlyAccess =>
      benefits.any((benefit) => benefit is HostMembershipMembersOnlyAccess);

  int? priceFor(HostMembershipInterval interval) => switch (interval) {
    HostMembershipInterval.monthly => monthlyPriceInPaise,
    HostMembershipInterval.annual => annualPriceInPaise,
  };

  List<HostMembershipInterval> get intervals => [
    for (final interval in HostMembershipInterval.values)
      if (priceFor(interval) != null) interval,
  ];
}

/// Advisory pricing guidance for plans that include or discount events.
enum HostMembershipPricingHint {
  /// No discount benefit, or not enough information to compare.
  none,

  /// The plan costs less than a regular's typical monthly ticket spend that
  /// it gives away, so frequent members may cost the host money.
  belowTypicalSpend,

  /// The plan is in line with what regulars already spend.
  healthy,
}

/// Regulars are assumed to attend weekly when comparing a plan's monthly
/// price with the ticket revenue its event discount gives away.
const hostMembershipPricingHintEventsPerMonth = 4;

/// Never blocks saving; shown beside the price in the plan editor.
HostMembershipPricingHint hostMembershipPricingHint({
  required int? monthlyPriceInPaise,
  required int? annualPriceInPaise,
  required int? typicalEventPriceInPaise,
  required int? discountPercent,
}) {
  final monthly =
      monthlyPriceInPaise ??
      (annualPriceInPaise == null ? null : annualPriceInPaise ~/ 12);
  if (monthly == null ||
      typicalEventPriceInPaise == null ||
      typicalEventPriceInPaise <= 0 ||
      discountPercent == null ||
      discountPercent <= 0) {
    return HostMembershipPricingHint.none;
  }
  final givenAway =
      typicalEventPriceInPaise *
      hostMembershipPricingHintEventsPerMonth *
      discountPercent ~/
      100;
  return monthly < givenAway
      ? HostMembershipPricingHint.belowTypicalSpend
      : HostMembershipPricingHint.healthy;
}
