import 'dart:math' as math;

import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';

/// Entitlements survive this long after a period end while retries run.
const hostMembershipPastDueGrace = Duration(days: 3);

/// Razorpay's smallest chargeable amount.
const _minimumChargeInPaise = 100;

/// One plan's event price: a fixed amount or a percentage off.
class HostMembershipPriceOverride {
  const HostMembershipPriceOverride({
    required this.planId,
    this.priceInPaise,
    this.percentOff,
  });

  final String planId;
  final int? priceInPaise;
  final int? percentOff;
}

/// An event's paid-membership rules: `eventMembershipRules/{eventId}`.
class EventMembershipRules {
  const EventMembershipRules({
    required this.memberPriceOverrides,
    required this.generalSaleOpensAt,
    required this.membersOnly,
  });

  factory EventMembershipRules.fromMap(Map<Object?, Object?> map) {
    final overrides = map['memberPriceOverrides'];
    final early = map['earlyAccess'];
    return EventMembershipRules(
      memberPriceOverrides: [
        for (final raw in overrides is List ? overrides : const [])
          _override(membershipMap(raw, 'memberPriceOverride')),
      ],
      generalSaleOpensAt: early == null
          ? null
          : membershipDateTime(
              membershipMap(early, 'earlyAccess'),
              'generalSaleOpensAtMillis',
            ),
      membersOnly: membershipBool(map, 'membersOnly'),
    );
  }

  final List<HostMembershipPriceOverride> memberPriceOverrides;
  final DateTime? generalSaleOpensAt;
  final bool membersOnly;
}

HostMembershipPriceOverride _override(Map<Object?, Object?> map) =>
    HostMembershipPriceOverride(
      planId: membershipString(map, 'planId'),
      priceInPaise: map.containsKey('priceInPaise')
          ? membershipInt(map, 'priceInPaise')
          : null,
      percentOff: map.containsKey('percentOff')
          ? membershipInt(map, 'percentOff')
          : null,
    );

/// Why paid-membership rules stop a guest booking now.
enum HostMembershipAdmissionBlock { paidMembershipRequired, memberEarlyAccess }

/// One guest's paid-membership outcome for one event.
class HostMembershipEntitlement {
  const HostMembershipEntitlement({
    required this.priceInPaise,
    required this.listPriceInPaise,
    required this.memberPriceApplied,
    required this.bookingCapReached,
    required this.admissionBlock,
    required this.offer,
    required this.memberEntitled,
  });

  final int priceInPaise;
  final int listPriceInPaise;
  final bool memberPriceApplied;
  final bool bookingCapReached;
  final HostMembershipAdmissionBlock? admissionBlock;
  final HostMembershipEventOffer? offer;

  /// Null without a membership; false when it grants nothing now.
  final bool? memberEntitled;

  int get savingsInPaise => listPriceInPaise - priceInPaise;
}

/// Whether a membership grants enforced benefits now. A host billing pause
/// keeps entitlements; a member pause stops them.
bool hostMembershipIsEntitled(HostMembership membership, DateTime now) {
  switch (membership.status) {
    case HostMembershipStatus.paused:
      return membership.pausedByHost;
    case HostMembershipStatus.expired:
      return false;
    case _:
      final endsAt = membership.currentPeriodEnd ?? membership.trialEndsAt;
      return endsAt != null &&
          now.isBefore(endsAt.add(hostMembershipPastDueGrace));
  }
}

int _percentOff(int listPriceInPaise, int percentOff) {
  final discounted = (listPriceInPaise * (100 - percentOff)) ~/ 100;
  if (discounted > 0 && discounted < _minimumChargeInPaise) {
    return math.min(listPriceInPaise, _minimumChargeInPaise);
  }
  return discounted;
}

/// The plan's price for one event: an event override first, then the plan's
/// default discount. Null means the plan gives no member price here.
int? hostMembershipPlanPriceForEvent({
  required int listPriceInPaise,
  required HostMembershipPlan plan,
  required EventMembershipRules? rules,
}) {
  final list = math.max(0, listPriceInPaise);
  final override = rules?.memberPriceOverrides
      .where((entry) => entry.planId == plan.id)
      .firstOrNull;
  int? price;
  if (override != null) {
    price = override.priceInPaise != null
        ? math.min(list, override.priceInPaise!)
        : _percentOff(list, override.percentOff ?? 0);
  } else {
    final discount = plan.benefits
        .whereType<HostMembershipEventDiscount>()
        .firstOrNull;
    if (discount != null) price = _percentOff(list, discount.percentOff);
  }
  return price == null || price >= list ? null : price;
}

bool _planHas<T extends HostMembershipBenefit>(HostMembershipPlan plan) =>
    plan.benefits.whereType<T>().isNotEmpty;

HostMembershipAdmissionBlock? _admissionBlock({
  required EventMembershipRules? rules,
  required HostMembershipPlan? plan,
  required bool entitled,
  required DateTime now,
}) {
  if (rules == null) return null;
  bool holds<T extends HostMembershipBenefit>() =>
      entitled && plan != null && _planHas<T>(plan);
  if (rules.membersOnly && !holds<HostMembershipMembersOnlyAccess>()) {
    return HostMembershipAdmissionBlock.paidMembershipRequired;
  }
  final opensAt = rules.generalSaleOpensAt;
  if (opensAt != null &&
      now.isBefore(opensAt) &&
      !holds<HostMembershipEarlyAccess>()) {
    return HostMembershipAdmissionBlock.memberEarlyAccess;
  }
  return null;
}

({HostMembershipInterval interval, int amount})? _billedPrice(
  HostMembershipPlan plan,
) {
  final monthly = plan.monthlyPriceInPaise;
  if (monthly != null) {
    return (interval: HostMembershipInterval.monthly, amount: monthly);
  }
  final annual = plan.annualPriceInPaise;
  if (annual != null) {
    return (interval: HostMembershipInterval.annual, amount: annual);
  }
  return null;
}

/// Mirrors Functions' `evaluateHostMembershipEntitlement`, which stays the
/// owner: the event screen shows its outcome and the booking command charges
/// what the server computes. `contracts/parity/event_booking_viewer_cases.json`
/// holds the shared cases both implementations must pass.
HostMembershipEntitlement evaluateHostMembershipEntitlement({
  required int listPriceInPaise,
  required EventMembershipRules? rules,
  required HostMembership? membership,
  required HostMembershipPlan? plan,
  required List<HostMembershipPlan> publishedPlans,
  required int upcomingMemberPricedBookings,
  required DateTime now,
}) {
  final list = math.max(0, listPriceInPaise);
  final memberPlan = membership != null && plan?.id == membership.planId
      ? plan
      : null;
  final entitled =
      membership != null &&
      memberPlan != null &&
      hostMembershipIsEntitled(membership, now);
  final block = _admissionBlock(
    rules: rules,
    plan: memberPlan,
    entitled: entitled,
    now: now,
  );

  var price = list;
  var applied = false;
  var capReached = false;
  if (entitled) {
    final memberPrice = hostMembershipPlanPriceForEvent(
      listPriceInPaise: list,
      plan: memberPlan,
      rules: rules,
    );
    final cap = memberPlan.maxUpcomingMemberPricedBookings;
    if (memberPrice != null) {
      if (cap != null && upcomingMemberPricedBookings >= cap) {
        capReached = true;
      } else {
        price = memberPrice;
        applied = true;
      }
    }
  }

  HostMembershipEventOffer? offer;
  final canJoin =
      membership == null || membership.status == HostMembershipStatus.expired;
  if (canJoin) {
    double? bestMonthly;
    for (final candidate in publishedPlans) {
      final cap = candidate.memberCap;
      if (candidate.status != HostMembershipPlanStatus.published ||
          cap != null && candidate.activeMemberCount >= cap) {
        continue;
      }
      final billed = _billedPrice(candidate);
      if (billed == null) continue;
      final candidateBlock = _admissionBlock(
        rules: rules,
        plan: candidate,
        entitled: true,
        now: now,
      );
      if (candidateBlock != null) continue;
      final unlocksAccess = block != null;
      final memberPrice =
          hostMembershipPlanPriceForEvent(
            listPriceInPaise: list,
            plan: candidate,
            rules: rules,
          ) ??
          list;
      if (!unlocksAccess && memberPrice >= price) continue;
      final monthly = billed.interval == HostMembershipInterval.annual
          ? billed.amount / 12
          : billed.amount.toDouble();
      final best = offer;
      if (best == null ||
          memberPrice < best.memberPriceInPaise ||
          memberPrice == best.memberPriceInPaise && monthly < bestMonthly!) {
        offer = HostMembershipEventOffer(
          planId: candidate.id,
          planName: candidate.name,
          interval: billed.interval,
          planPriceInPaise: billed.amount,
          memberPriceInPaise: memberPrice,
          savingsInPaise: math.max(0, list - memberPrice),
          unlocksAccess: unlocksAccess,
        );
        bestMonthly = monthly;
      }
    }
  }

  return HostMembershipEntitlement(
    priceInPaise: price,
    listPriceInPaise: list,
    memberPriceApplied: applied,
    bookingCapReached: capReached,
    admissionBlock: block,
    offer: offer,
    memberEntitled: membership == null ? null : entitled,
  );
}

/// The event screen's membership facts for one guest. A waitlist offer keeps
/// list price, so it shows no member saving.
EventHostMembershipFacts hostMembershipEventFacts({
  required HostMembershipEntitlement entitlement,
  required HostMembership? membership,
  required EventMembershipRules? rules,
  bool listPriceOffer = false,
}) => EventHostMembershipFacts(
  memberPlanName: membership?.planName,
  memberStatus: membership?.status,
  entitled: entitlement.memberEntitled ?? false,
  listPriceInPaise: entitlement.listPriceInPaise,
  memberPriceApplied: entitlement.memberPriceApplied && !listPriceOffer,
  bookingCapReached: entitlement.bookingCapReached,
  savingsInPaise: listPriceOffer ? 0 : entitlement.savingsInPaise,
  membersOnly: rules?.membersOnly ?? false,
  generalSaleOpensAt: rules?.generalSaleOpensAt,
  offer: entitlement.offer,
);
