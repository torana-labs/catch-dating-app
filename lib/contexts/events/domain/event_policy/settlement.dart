// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/eventPolicySettlement.dart.template

part of '../event_policy.dart';

class EventSettlementPolicy {
  const EventSettlementPolicy.afterEventCompletion()
    : hostPayoutTiming = EventHostPayoutTiming.afterEventCompletion;

  final EventHostPayoutTiming hostPayoutTiming;

  factory EventSettlementPolicy.fromJson(Map<String, dynamic> json) {
    final timing = _enumFromName(
      EventHostPayoutTiming.values,
      json['hostPayoutTiming'],
      EventHostPayoutTiming.afterEventCompletion,
    );
    return switch (timing) {
      EventHostPayoutTiming.afterEventCompletion =>
        const EventSettlementPolicy.afterEventCompletion(),
    };
  }

  Map<String, Object?> toJson() => {'hostPayoutTiming': hostPayoutTiming.name};

  String get title {
    return switch (hostPayoutTiming) {
      EventHostPayoutTiming.afterEventCompletion => 'After event completion',
    };
  }

  String get summary {
    return switch (hostPayoutTiming) {
      EventHostPayoutTiming.afterEventCompletion =>
        'Platform holds attendee payments until the event is completed, so host cancellations can be refunded without clawbacks.',
    };
  }
}
