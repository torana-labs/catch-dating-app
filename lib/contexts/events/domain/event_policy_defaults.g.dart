// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_policy_defaults.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventPolicyDefaults _$EventPolicyDefaultsFromJson(Map<String, dynamic> json) =>
    _EventPolicyDefaults(
      admissionPreset:
          $enumDecodeNullable(
            _$EventAdmissionDefaultPresetEnumMap,
            json['admissionPreset'],
          ) ??
          EventAdmissionDefaultPreset.openCapacity,
      minAge: (json['minAge'] as num?)?.toInt() ?? 0,
      maxAge: (json['maxAge'] as num?)?.toInt() ?? 99,
      maxMen: (json['maxMen'] as num?)?.toInt(),
      maxWomen: (json['maxWomen'] as num?)?.toInt(),
      dynamicPricingEnabled: json['dynamicPricingEnabled'] as bool? ?? false,
      dynamicPricingStepInPaise: (json['dynamicPricingStepInPaise'] as num?)
          ?.toInt(),
      dynamicPricingMaxInPaise: (json['dynamicPricingMaxInPaise'] as num?)
          ?.toInt(),
      cancellationPolicyId:
          $enumDecodeNullable(
            _$EventCancellationPolicyIdEnumMap,
            json['cancellationPolicyId'],
          ) ??
          EventCancellationPolicyId.standard,
    );

Map<String, dynamic> _$EventPolicyDefaultsToJson(
  _EventPolicyDefaults instance,
) => <String, dynamic>{
  'admissionPreset':
      _$EventAdmissionDefaultPresetEnumMap[instance.admissionPreset]!,
  'minAge': instance.minAge,
  'maxAge': instance.maxAge,
  'maxMen': instance.maxMen,
  'maxWomen': instance.maxWomen,
  'dynamicPricingEnabled': instance.dynamicPricingEnabled,
  'dynamicPricingStepInPaise': instance.dynamicPricingStepInPaise,
  'dynamicPricingMaxInPaise': instance.dynamicPricingMaxInPaise,
  'cancellationPolicyId':
      _$EventCancellationPolicyIdEnumMap[instance.cancellationPolicyId]!,
};

const _$EventAdmissionDefaultPresetEnumMap = {
  EventAdmissionDefaultPreset.openCapacity: 'openCapacity',
  EventAdmissionDefaultPreset.inviteOnly: 'inviteOnly',
  EventAdmissionDefaultPreset.balancedSingles: 'balancedSingles',
  EventAdmissionDefaultPreset.fixedCohortCaps: 'fixedCohortCaps',
};

const _$EventCancellationPolicyIdEnumMap = {
  EventCancellationPolicyId.notApplicable: 'notApplicable',
  EventCancellationPolicyId.flexible: 'flexible',
  EventCancellationPolicyId.standard: 'standard',
  EventCancellationPolicyId.strict: 'strict',
};
