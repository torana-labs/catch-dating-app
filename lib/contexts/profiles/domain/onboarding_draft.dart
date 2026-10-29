import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'onboarding_draft.freezed.dart';
part 'onboarding_draft.g.dart';

@freezed
abstract class OnboardingDraft with _$OnboardingDraft {
  const OnboardingDraft._();

  const factory OnboardingDraft({
    required int step,
    @Default(0) int draftVersion,
    @Default('') String firstName,
    @Default('') String lastName,
    @NullableTimestampConverter() DateTime? dateOfBirth,
    @Default('') String phoneNumber,
    @Default(defaultCountryDialCode) String countryCode,
    Gender? gender,
    @Default([]) List<Gender> interestedInGenders,
    String? instagramHandle,
    @Default([]) List<ProfilePromptAnswer> profilePrompts,
  }) = _OnboardingDraft;

  factory OnboardingDraft.fromJson(Map<String, dynamic> json) =>
      _$OnboardingDraftFromJson(json);
}
