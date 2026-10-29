// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_draft.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OnboardingDraft _$OnboardingDraftFromJson(
  Map<String, dynamic> json,
) => _OnboardingDraft(
  step: (json['step'] as num).toInt(),
  draftVersion: (json['draftVersion'] as num?)?.toInt() ?? 0,
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String? ?? '',
  dateOfBirth: const NullableTimestampConverter().fromJson(json['dateOfBirth']),
  phoneNumber: json['phoneNumber'] as String? ?? '',
  countryCode: json['countryCode'] as String? ?? defaultCountryDialCode,
  gender: $enumDecodeNullable(_$GenderEnumMap, json['gender']),
  interestedInGenders:
      (json['interestedInGenders'] as List<dynamic>?)
          ?.map((e) => $enumDecode(_$GenderEnumMap, e))
          .toList() ??
      const [],
  instagramHandle: json['instagramHandle'] as String?,
  profilePrompts:
      (json['profilePrompts'] as List<dynamic>?)
          ?.map((e) => ProfilePromptAnswer.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
);

Map<String, dynamic> _$OnboardingDraftToJson(_OnboardingDraft instance) =>
    <String, dynamic>{
      'step': instance.step,
      'draftVersion': instance.draftVersion,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'dateOfBirth': const NullableTimestampConverter().toJson(
        instance.dateOfBirth,
      ),
      'phoneNumber': instance.phoneNumber,
      'countryCode': instance.countryCode,
      'gender': _$GenderEnumMap[instance.gender],
      'interestedInGenders': instance.interestedInGenders
          .map((e) => _$GenderEnumMap[e]!)
          .toList(),
      'instagramHandle': instance.instagramHandle,
      'profilePrompts': instance.profilePrompts.map((e) => e.toJson()).toList(),
    };

const _$GenderEnumMap = {
  Gender.man: 'man',
  Gender.woman: 'woman',
  Gender.nonBinary: 'nonBinary',
  Gender.other: 'other',
};
