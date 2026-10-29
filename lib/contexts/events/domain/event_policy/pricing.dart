part of '../event_policy.dart';

class MoneyAmount {
  const MoneyAmount.inPaise(this.inPaise);

  final int inPaise;

  MoneyAmount plus(MoneyAmount other) =>
      MoneyAmount.inPaise(math.max(0, inPaise + other.inPaise));

  MoneyAmount percent(int percent) {
    return MoneyAmount.inPaise((inPaise * percent / 100).round());
  }

  MoneyAmount clamp({MoneyAmount? max}) {
    final maxValue = max?.inPaise;
    return MoneyAmount.inPaise(
      maxValue == null ? math.max(0, inPaise) : inPaise.clamp(0, maxValue),
    );
  }

  bool get isFree => inPaise == 0;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MoneyAmount && other.inPaise == inPaise;

  @override
  int get hashCode => inPaise.hashCode;

  @override
  String toString() => 'MoneyAmount.inPaise($inPaise)';
}

class EventDemandPricingRule {
  const EventDemandPricingRule({
    required this.pricedCohortId,
    required this.balancingCohortId,
    required this.stepAdjustment,
    required this.maxAdjustment,
    this.freeSkew = 1,
    this.demandStep = 1,
  });

  final String pricedCohortId;
  final String balancingCohortId;
  final MoneyAmount stepAdjustment;
  final MoneyAmount maxAdjustment;
  final int freeSkew;
  final int demandStep;

  MoneyAmount adjustmentFor({
    required String cohortId,
    required EventRosterSnapshot roster,
    bool includeRequestedAttendee = true,
  }) {
    if (cohortId != pricedCohortId) return const MoneyAmount.inPaise(0);

    final pricedDemand =
        roster.interestCountFor(pricedCohortId) +
        (includeRequestedAttendee ? 1 : 0);
    final balancingDemand = roster.interestCountFor(balancingCohortId);
    final excessDemand = pricedDemand - balancingDemand - freeSkew;
    if (excessDemand <= 0) return const MoneyAmount.inPaise(0);

    final steps = (excessDemand / math.max(1, demandStep)).ceil();
    return MoneyAmount.inPaise(
      math.min(maxAdjustment.inPaise, stepAdjustment.inPaise * steps),
    );
  }

  factory EventDemandPricingRule.fromJson(Map<String, dynamic> json) {
    return EventDemandPricingRule(
      pricedCohortId:
          _stringValue(json['pricedCohortId']) ??
          EventCohortIds.menInterestedInWomen,
      balancingCohortId:
          _stringValue(json['balancingCohortId']) ??
          EventCohortIds.womenInterestedInMen,
      stepAdjustment: MoneyAmount.inPaise(
        _intValue(json['stepAdjustmentInPaise'], fallback: 0),
      ),
      maxAdjustment: MoneyAmount.inPaise(
        _intValue(json['maxAdjustmentInPaise'], fallback: 0),
      ),
      freeSkew: _intValue(json['freeSkew'], fallback: 1),
      demandStep: _intValue(json['demandStep'], fallback: 1),
    );
  }

  Map<String, Object?> toJson() => {
    'pricedCohortId': pricedCohortId,
    'balancingCohortId': balancingCohortId,
    'stepAdjustmentInPaise': stepAdjustment.inPaise,
    'maxAdjustmentInPaise': maxAdjustment.inPaise,
    'freeSkew': freeSkew,
    'demandStep': demandStep,
  };
}

class EventPricingPolicy {
  const EventPricingPolicy({
    required this.basePrice,
    this.cohortAdjustments = const {},
    this.demandPricingRules = const [],
  });

  const EventPricingPolicy.fixed(MoneyAmount basePrice)
    : this(basePrice: basePrice);

  final MoneyAmount basePrice;
  final Map<String, MoneyAmount> cohortAdjustments;
  final List<EventDemandPricingRule> demandPricingRules;

  EventPriceQuote quoteFor({
    required EventCohort cohort,
    required EventRosterSnapshot roster,
  }) {
    final cohortAdjustment =
        cohortAdjustments[cohort.id] ?? const MoneyAmount.inPaise(0);
    final demandAdjustment = demandPricingRules.fold(
      const MoneyAmount.inPaise(0),
      (total, rule) =>
          total.plus(rule.adjustmentFor(cohortId: cohort.id, roster: roster)),
    );
    final finalAmount = basePrice.plus(cohortAdjustment).plus(demandAdjustment);

    return EventPriceQuote(
      basePrice: basePrice,
      cohort: cohort,
      cohortAdjustment: cohortAdjustment,
      demandAdjustment: demandAdjustment,
      finalAmount: finalAmount,
    );
  }

  bool get hasDemandPricing => demandPricingRules.isNotEmpty;

  factory EventPricingPolicy.fromJson(Map<String, dynamic> json) {
    return EventPricingPolicy(
      basePrice: MoneyAmount.inPaise(
        _intValue(json['basePriceInPaise'], fallback: 0),
      ),
      cohortAdjustments: _intMap(
        json['cohortAdjustmentsInPaise'],
      ).map((key, value) => MapEntry(key, MoneyAmount.inPaise(value))),
      demandPricingRules: _listValue(json['demandPricingRules'])
          .map(_mapValue)
          .whereType<Map<String, dynamic>>()
          .map(EventDemandPricingRule.fromJson)
          .toList(growable: false),
    );
  }

  Map<String, Object?> toJson() => {
    'basePriceInPaise': basePrice.inPaise,
    'cohortAdjustmentsInPaise': cohortAdjustments.map(
      (key, value) => MapEntry(key, value.inPaise),
    ),
    'demandPricingRules': demandPricingRules
        .map((rule) => rule.toJson())
        .toList(growable: false),
  };
}

class EventPriceQuote {
  const EventPriceQuote({
    required this.basePrice,
    required this.cohort,
    required this.cohortAdjustment,
    required this.demandAdjustment,
    required this.finalAmount,
  });

  final MoneyAmount basePrice;
  final EventCohort cohort;
  final MoneyAmount cohortAdjustment;
  final MoneyAmount demandAdjustment;
  final MoneyAmount finalAmount;

  bool get isFree => finalAmount.isFree;
}

extension _EventPricingPolicyX on EventPricingPolicy {
  EventPricingPolicy copyWithDemandRule(EventDemandPricingRule? rule) {
    if (rule == null) return this;
    return EventPricingPolicy(
      basePrice: basePrice,
      cohortAdjustments: cohortAdjustments,
      demandPricingRules: [rule],
    );
  }
}
