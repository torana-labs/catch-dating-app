import 'package:catch_dating_app/contexts/payments/payments.dart';

enum HostMembershipBillingPauseState {
  active,
  pausing,
  paused,
  resuming;

  static HostMembershipBillingPauseState fromWire(String value) =>
      membershipEnum(values, value, (state) => state.name);

  bool get isPausedOrPausing =>
      this == HostMembershipBillingPauseState.paused ||
      this == HostMembershipBillingPauseState.pausing;
}

/// Who collects membership money for the organizer: their own connected
/// Razorpay account, or Catch's account with a Route split.
enum HostMembershipPaymentMode {
  hostCollected,
  platformSplit;

  static HostMembershipPaymentMode? fromWire(String? value) =>
      value == null ? null : membershipEnum(values, value, (mode) => mode.name);
}

/// The server's first reason memberships cannot run for the organizer.
/// [other] keeps older builds working when the server adds a reason.
enum HostMembershipUnavailableReason {
  notOffered,
  termsNotConfigured,
  razorpayNotConnected,
  razorpayNeedsAttention,
  subscriptionsNotEnabled,
  payoutAccountNotReady,
  providerUnavailable,
  other;

  static HostMembershipUnavailableReason? fromWire(String? value) {
    if (value == null) return null;
    for (final reason in values) {
      if (reason.name == value) return reason;
    }
    return other;
  }
}

/// Manager projection of an organizer's paid membership program.
class HostMembershipProgramView {
  const HostMembershipProgramView({
    required this.enabled,
    required this.testMode,
    required this.billingPause,
    required this.memberCount,
    required this.routeAccountReady,
    required this.feeConfigured,
    required this.exists,
    this.paymentMode,
    this.unavailableReason,
  });

  factory HostMembershipProgramView.fromResponse(Object? data) {
    final map = membershipMap(data, 'membership program');
    final program = map['program'] == null
        ? null
        : membershipMap(map['program'], 'program');
    return HostMembershipProgramView(
      exists: program != null,
      enabled:
          program != null && membershipString(program, 'state') == 'enabled',
      testMode: program != null && membershipString(program, 'mode') == 'test',
      billingPause: program == null
          ? HostMembershipBillingPauseState.active
          : HostMembershipBillingPauseState.fromWire(
              membershipString(program, 'billingPauseState'),
            ),
      memberCount: program == null ? 0 : membershipInt(program, 'memberCount'),
      routeAccountReady: membershipBool(map, 'routeAccountReady'),
      feeConfigured: membershipBool(map, 'feeConfigured'),
      // Absent from servers that predate payment modes.
      paymentMode: HostMembershipPaymentMode.fromWire(
        membershipNullableString(map, 'paymentMode'),
      ),
      unavailableReason: HostMembershipUnavailableReason.fromWire(
        membershipNullableString(map, 'unavailableReason'),
      ),
    );
  }

  final bool exists;
  final bool enabled;
  final bool testMode;
  final HostMembershipBillingPauseState billingPause;
  final int memberCount;

  /// The payment account the effective mode needs is ready.
  final bool routeAccountReady;

  /// Catch's commercial terms resolve for this organizer.
  final bool feeConfigured;
  final HostMembershipPaymentMode? paymentMode;
  final HostMembershipUnavailableReason? unavailableReason;

  bool get collectsOnOwnAccount =>
      paymentMode == HostMembershipPaymentMode.hostCollected;

  bool get canEnable =>
      routeAccountReady &&
      feeConfigured &&
      !enabled &&
      unavailableReason == null;
}

/// Editable plan fields sent to `manageHostMembershipPlans` `save`.
class HostMembershipPlanDraft {
  const HostMembershipPlanDraft({
    required this.name,
    this.description = '',
    this.monthlyPriceInPaise,
    this.annualPriceInPaise,
    this.memberCap,
    this.trialDays = 0,
    this.benefits = const [],
    this.perks = const [],
    this.maxUpcomingMemberPricedBookings,
    this.sortOrder = 0,
  });

  factory HostMembershipPlanDraft.fromPlan(HostMembershipPlan plan) =>
      HostMembershipPlanDraft(
        name: plan.name,
        description: plan.description,
        monthlyPriceInPaise: plan.monthlyPriceInPaise,
        annualPriceInPaise: plan.annualPriceInPaise,
        memberCap: plan.memberCap,
        trialDays: plan.trialDays,
        benefits: plan.benefits,
        perks: plan.perks,
        maxUpcomingMemberPricedBookings: plan.maxUpcomingMemberPricedBookings,
        sortOrder: plan.sortOrder,
      );

  /// Plan prices stay within the RBI e-mandate no-re-authentication ceiling.
  static const minPriceInPaise = 1000;
  static const maxPriceInPaise = 1500000;

  final String name;
  final String description;
  final int? monthlyPriceInPaise;
  final int? annualPriceInPaise;
  final int? memberCap;
  final int trialDays;
  final List<HostMembershipBenefit> benefits;
  final List<String> perks;
  final int? maxUpcomingMemberPricedBookings;
  final int sortOrder;

  static bool validPrice(int? paise) =>
      paise == null || (paise >= minPriceInPaise && paise <= maxPriceInPaise);

  bool get isValid =>
      name.trim().isNotEmpty &&
      (monthlyPriceInPaise != null || annualPriceInPaise != null) &&
      validPrice(monthlyPriceInPaise) &&
      validPrice(annualPriceInPaise);

  Map<String, Object?> toPayload() => {
    'name': name.trim(),
    'description': description.trim(),
    'prices': {
      if (monthlyPriceInPaise != null)
        'monthly': {'amountPaise': monthlyPriceInPaise},
      if (annualPriceInPaise != null)
        'annual': {'amountPaise': annualPriceInPaise},
    },
    'memberCap': memberCap,
    'trialDays': trialDays,
    'benefits': [for (final benefit in benefits) benefit.toPayload()],
    'perks': [
      for (final perk in perks)
        if (perk.trim().isNotEmpty) perk.trim(),
    ],
    'limits': {
      'maxUpcomingMemberPricedBookings': maxUpcomingMemberPricedBookings,
    },
    'sortOrder': sortOrder,
  };
}

/// One plan's member price for one event: a fixed price or percent off.
class HostEventMemberPriceOverride {
  const HostEventMemberPriceOverride.fixed({
    required this.planId,
    required int this.priceInPaise,
  }) : percentOff = null;

  const HostEventMemberPriceOverride.percentOff({
    required this.planId,
    required int this.percentOff,
  }) : priceInPaise = null;

  factory HostEventMemberPriceOverride.fromMap(Map<Object?, Object?> map) =>
      map.containsKey('priceInPaise')
      ? HostEventMemberPriceOverride.fixed(
          planId: membershipString(map, 'planId'),
          priceInPaise: membershipInt(map, 'priceInPaise'),
        )
      : HostEventMemberPriceOverride.percentOff(
          planId: membershipString(map, 'planId'),
          percentOff: membershipInt(map, 'percentOff'),
        );

  final String planId;
  final int? priceInPaise;
  final int? percentOff;

  bool get included => priceInPaise == 0 || percentOff == 100;

  Map<String, Object?> toPayload() => {
    'planId': planId,
    if (priceInPaise != null) 'priceInPaise': priceInPaise,
    if (percentOff != null) 'percentOff': percentOff,
  };
}

/// Paid-membership rules for one event and the plans they may reference.
class HostEventMembershipRules {
  const HostEventMembershipRules({
    required this.eventId,
    required this.overrides,
    required this.earlyAccessHours,
    required this.generalSaleOpensAt,
    required this.membersOnly,
    required this.revision,
    required this.plans,
  });

  factory HostEventMembershipRules.fromResponse(Object? data) {
    final map = membershipMap(data, 'event membership rules');
    final rules = map['rules'] == null
        ? null
        : membershipMap(map['rules'], 'rules');
    final plans = map['plans'];
    if (plans is! List<Object?>) {
      throw const FormatException('Invalid membership plans.');
    }
    final overrides = rules?['memberPriceOverrides'];
    return HostEventMembershipRules(
      eventId: membershipString(map, 'eventId'),
      overrides: overrides is List<Object?>
          ? List.unmodifiable(
              overrides.map(
                (item) => HostEventMemberPriceOverride.fromMap(
                  membershipMap(item, 'override'),
                ),
              ),
            )
          : const [],
      earlyAccessHours: rules == null
          ? null
          : membershipNullableInt(rules, 'earlyAccessHours'),
      generalSaleOpensAt: rules == null
          ? null
          : membershipDateTime(rules, 'generalSaleOpensAtMillis'),
      membersOnly: rules != null && membershipBool(rules, 'membersOnly'),
      revision: rules == null ? null : membershipInt(rules, 'revision'),
      plans: List.unmodifiable(
        plans.map((item) {
          final plan = membershipMap(item, 'plan');
          final benefits = plan['benefits'];
          return HostEventMembershipPlanOption(
            planId: membershipString(plan, 'planId'),
            name: membershipString(plan, 'name'),
            published: membershipString(plan, 'status') == 'published',
            benefits: benefits is List<Object?>
                ? List.unmodifiable(
                    benefits.map(
                      (benefit) => HostMembershipBenefit.fromMap(
                        membershipMap(benefit, 'benefit'),
                      ),
                    ),
                  )
                : const [],
          );
        }),
      ),
    );
  }

  final String eventId;
  final List<HostEventMemberPriceOverride> overrides;
  final int? earlyAccessHours;
  final DateTime? generalSaleOpensAt;
  final bool membersOnly;
  final int? revision;
  final List<HostEventMembershipPlanOption> plans;

  bool get hasPlans => plans.isNotEmpty;

  HostEventMemberPriceOverride? overrideFor(String planId) =>
      overrides.where((entry) => entry.planId == planId).firstOrNull;
}

class HostEventMembershipPlanOption {
  const HostEventMembershipPlanOption({
    required this.planId,
    required this.name,
    required this.published,
    required this.benefits,
  });

  final String planId;
  final String name;
  final bool published;
  final List<HostMembershipBenefit> benefits;

  bool get grantsEarlyAccess =>
      benefits.any((benefit) => benefit is HostMembershipEarlyAccess);

  bool get grantsMembersOnlyAccess =>
      benefits.any((benefit) => benefit is HostMembershipMembersOnlyAccess);
}
