import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_policy_defaults.freezed.dart';
part 'event_policy_defaults.g.dart';

enum EventAdmissionDefaultPreset {
  openCapacity,
  inviteOnly,
  balancedSingles,
  fixedCohortCaps,
}

@freezed
abstract class EventPolicyDefaults with _$EventPolicyDefaults {
  const EventPolicyDefaults._();

  const factory EventPolicyDefaults({
    @Default(EventAdmissionDefaultPreset.openCapacity)
    EventAdmissionDefaultPreset admissionPreset,
    @Default(0) int minAge,
    @Default(99) int maxAge,
    int? maxMen,
    int? maxWomen,
    @Default(false) bool dynamicPricingEnabled,
    int? dynamicPricingStepInPaise,
    int? dynamicPricingMaxInPaise,
    @Default(EventCancellationPolicyId.standard)
    EventCancellationPolicyId cancellationPolicyId,
  }) = _EventPolicyDefaults;

  factory EventPolicyDefaults.fromJson(Map<String, dynamic> json) =>
      _$EventPolicyDefaultsFromJson(json);

  EventConstraints toConstraints() => EventConstraints(
    minAge: minAge,
    maxAge: maxAge,
    maxMen: admissionPreset == EventAdmissionDefaultPreset.fixedCohortCaps
        ? maxMen
        : null,
    maxWomen: admissionPreset == EventAdmissionDefaultPreset.fixedCohortCaps
        ? maxWomen
        : null,
  );

  EventCancellationPolicy get cancellationPolicy =>
      switch (cancellationPolicyId) {
        EventCancellationPolicyId.notApplicable =>
          const EventCancellationPolicy.notApplicable(),
        EventCancellationPolicyId.flexible =>
          const EventCancellationPolicy.flexible(),
        EventCancellationPolicyId.standard =>
          const EventCancellationPolicy.standard(),
        EventCancellationPolicyId.strict =>
          const EventCancellationPolicy.strict(),
      };

  EventPolicyBundle toEventPolicyBundle({
    required int capacityLimit,
    required int basePriceInPaise,
    String? inviteCodeHint,
  }) {
    return switch (admissionPreset) {
      EventAdmissionDefaultPreset.openCapacity => EventPolicyBundle.openEvent(
        capacityLimit: capacityLimit,
        basePriceInPaise: basePriceInPaise,
        cancellationPolicy: cancellationPolicy,
      ),
      EventAdmissionDefaultPreset.inviteOnly =>
        EventPolicyBundle.inviteOnlyEvent(
          capacityLimit: capacityLimit,
          basePriceInPaise: basePriceInPaise,
          inviteCodeHint: inviteCodeHint,
          cancellationPolicy: cancellationPolicy,
        ),
      EventAdmissionDefaultPreset.balancedSingles =>
        dynamicPricingEnabled
            ? EventPolicyBundle.demandPricedBalancedSinglesEvent(
                capacityLimit: capacityLimit,
                basePriceInPaise: basePriceInPaise,
                stepAdjustmentInPaise: dynamicPricingStepInPaise ?? 0,
                maxAdjustmentInPaise: dynamicPricingMaxInPaise ?? 0,
                cancellationPolicy: cancellationPolicy,
              )
            : EventPolicyBundle.balancedSinglesEvent(
                capacityLimit: capacityLimit,
                basePriceInPaise: basePriceInPaise,
                cancellationPolicy: cancellationPolicy,
              ),
      EventAdmissionDefaultPreset.fixedCohortCaps =>
        EventPolicyBundle.fixedCohortCapsEvent(
          capacityLimit: capacityLimit,
          basePriceInPaise: basePriceInPaise,
          maxMenInterestedInWomen: maxMen,
          maxWomenInterestedInMen: maxWomen,
          cancellationPolicy: cancellationPolicy,
        ),
    };
  }
}
