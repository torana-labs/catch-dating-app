part of '../event_policy.dart';

class EventPolicyBundle {
  factory EventPolicyBundle({
    required EventAdmissionPolicy admissionPolicy,
    required EventPricingPolicy pricingPolicy,
    EventCancellationPolicy? cancellationPolicy,
    EventSettlementPolicy settlementPolicy =
        const EventSettlementPolicy.afterEventCompletion(),
    EventCohortResolver cohortResolver = const EventCohortResolver(),
  }) => EventPolicyBundle._(
    admissionPolicy: admissionPolicy,
    pricingPolicy: pricingPolicy,
    cancellationPolicy: pricingPolicy.basePrice.isFree
        ? const EventCancellationPolicy.notApplicable()
        : cancellationPolicy ?? const EventCancellationPolicy.standard(),
    settlementPolicy: settlementPolicy,
    cohortResolver: cohortResolver,
  );

  const EventPolicyBundle._({
    required this.admissionPolicy,
    required this.pricingPolicy,
    required this.cancellationPolicy,
    required this.settlementPolicy,
    required this.cohortResolver,
  });

  final EventAdmissionPolicy admissionPolicy;
  final EventPricingPolicy pricingPolicy;
  final EventCancellationPolicy cancellationPolicy;
  final EventSettlementPolicy settlementPolicy;
  final EventCohortResolver cohortResolver;

  static const version = 2;

  factory EventPolicyBundle.openEvent({
    required int capacityLimit,
    required int basePriceInPaise,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.open(
        capacityLimit: capacityLimit,
        waitlistPolicy: const EventWaitlistPolicy.rankedOffer(),
      ),
      pricingPolicy: EventPricingPolicy.fixed(
        MoneyAmount.inPaise(basePriceInPaise),
      ),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.inviteOnlyEvent({
    required int capacityLimit,
    required int basePriceInPaise,
    String? inviteCodeHint,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.inviteOnly(
        capacityLimit: capacityLimit,
        privateAccessPolicy: EventPrivateAccessPolicy.inviteCode(
          inviteCodeHint: inviteCodeHint,
        ),
      ),
      pricingPolicy: EventPricingPolicy.fixed(
        MoneyAmount.inPaise(basePriceInPaise),
      ),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.requestToJoinEvent({
    required int capacityLimit,
    bool approvedMembersSkipReview = false,
    required int basePriceInPaise,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.manualApproval(
        capacityLimit: capacityLimit,
        approvedMembersSkipReview: approvedMembersSkipReview,
        waitlistPolicy: const EventWaitlistPolicy(
          mode: EventWaitlistMode.manualReview,
          offerWindow: Duration.zero,
        ),
      ),
      pricingPolicy: EventPricingPolicy.fixed(
        MoneyAmount.inPaise(basePriceInPaise),
      ),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.fixedCohortCapsEvent({
    required int capacityLimit,
    required int basePriceInPaise,
    int? maxMenInterestedInWomen,
    int? maxWomenInterestedInMen,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.fixedCohortCaps(
        capacityLimit: capacityLimit,
        cohortCapacityLimits: {
          EventCohortIds.menInterestedInWomen: ?maxMenInterestedInWomen,
          EventCohortIds.womenInterestedInMen: ?maxWomenInterestedInMen,
        },
        waitlistPolicy: const EventWaitlistPolicy.rankedOffer(),
      ),
      pricingPolicy: EventPricingPolicy.fixed(
        MoneyAmount.inPaise(basePriceInPaise),
      ),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.balancedSinglesEvent({
    required int capacityLimit,
    required int basePriceInPaise,
    int maxSkew = 1,
    EventDemandPricingRule? demandPricingRule,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.balancedRatio(
        capacityLimit: capacityLimit,
        waitlistPolicy: const EventWaitlistPolicy.rankedOffer(),
        balancedRatioPolicy: BalancedRatioPolicy(
          leftCohortId: EventCohortIds.menInterestedInWomen,
          rightCohortId: EventCohortIds.womenInterestedInMen,
          maxSkew: maxSkew,
          outOfRatioCohortPolicy:
              EventOutOfRatioCohortPolicy.admitWithinGeneralCapacity,
        ),
      ),
      pricingPolicy: EventPricingPolicy.fixed(
        MoneyAmount.inPaise(basePriceInPaise),
      ).copyWithDemandRule(demandPricingRule),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.demandPricedBalancedSinglesEvent({
    required int capacityLimit,
    required int basePriceInPaise,
    required int stepAdjustmentInPaise,
    required int maxAdjustmentInPaise,
    int maxSkew = 1,
    EventCancellationPolicy cancellationPolicy =
        const EventCancellationPolicy.standard(),
  }) {
    return EventPolicyBundle.balancedSinglesEvent(
      capacityLimit: capacityLimit,
      basePriceInPaise: basePriceInPaise,
      maxSkew: maxSkew,
      demandPricingRule: EventDemandPricingRule(
        pricedCohortId: EventCohortIds.menInterestedInWomen,
        balancingCohortId: EventCohortIds.womenInterestedInMen,
        stepAdjustment: MoneyAmount.inPaise(stepAdjustmentInPaise),
        maxAdjustment: MoneyAmount.inPaise(maxAdjustmentInPaise),
      ),
      cancellationPolicy: cancellationPolicy,
    );
  }

  factory EventPolicyBundle.legacyEvent({
    required int capacityLimit,
    required int priceInPaise,
    int? maxMen,
    int? maxWomen,
  }) {
    if (maxMen != null || maxWomen != null) {
      return EventPolicyBundle.fixedCohortCapsEvent(
        capacityLimit: capacityLimit,
        basePriceInPaise: priceInPaise,
        maxMenInterestedInWomen: maxMen,
        maxWomenInterestedInMen: maxWomen,
      );
    }
    return EventPolicyBundle.openEvent(
      capacityLimit: capacityLimit,
      basePriceInPaise: priceInPaise,
    );
  }

  factory EventPolicyBundle.fromJson(Map<String, dynamic> json) {
    final pricingPolicy = EventPricingPolicy.fromJson(
      _mapValue(json['pricing']) ?? const {},
    );
    return EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.fromJson(
        _mapValue(json['admission']) ?? const {},
      ),
      pricingPolicy: pricingPolicy,
      cancellationPolicy: EventCancellationPolicy.fromJson(
        _mapValue(json['cancellation']) ?? const {},
      ),
      settlementPolicy: EventSettlementPolicy.fromJson(
        _mapValue(json['settlement']) ?? const {},
      ),
    );
  }

  int get capacityLimit => admissionPolicy.capacityLimit;
  int get basePriceInPaise => pricingPolicy.basePrice.inPaise;

  bool get usesBalancedRatio =>
      admissionPolicy.format == EventAdmissionFormat.balancedRatio;

  bool get usesFixedCohortCaps =>
      admissionPolicy.format == EventAdmissionFormat.fixedCohortCaps;

  bool get usesInviteOnly =>
      admissionPolicy.format == EventAdmissionFormat.inviteOnly ||
      admissionPolicy.inviteRequired;

  bool get usesDemandPricing => pricingPolicy.hasDemandPricing;

  bool get hasCancellationPolicy => cancellationPolicy.isApplicable;

  bool get usesCrossPathsPairInventory =>
      admissionPolicy.crossPathsPairInventory.isEnabled;

  EventPolicyBundle withCrossPathsPairInventory({
    required int reservedPairCapacity,
    Duration holdDuration = const Duration(minutes: 15),
  }) => EventPolicyBundle(
    admissionPolicy: admissionPolicy.withCrossPathsPairInventory(
      CrossPathsPairInventoryPolicy(
        enabled: reservedPairCapacity > 0,
        reservedPairCapacity: reservedPairCapacity,
        holdDuration: holdDuration,
      ),
    ),
    pricingPolicy: pricingPolicy,
    cancellationPolicy: cancellationPolicy,
    settlementPolicy: settlementPolicy,
    cohortResolver: cohortResolver,
  );

  Map<String, Object?> toJson() => {
    'version': version,
    'admission': admissionPolicy.toJson(),
    'pricing': pricingPolicy.toJson(),
    'cancellation': cancellationPolicy.toJson(),
    'settlement': settlementPolicy.toJson(),
  };
}
