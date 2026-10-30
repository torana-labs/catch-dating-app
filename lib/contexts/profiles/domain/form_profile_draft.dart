import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/labelled.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';

/// Editable review values, isolated from the immutable source submission.
class FormProfileDraft {
  FormProfileDraft(this.review)
    : profile = Map.of(review.currentProfile ?? {}),
      selected = {...review.selectedCardQuestionIds},
      linkedinUrl = review.currentLinkedinUrl;

  final FormProfileReview review;
  final Map<String, Object?> profile;
  final Set<String> selected;
  String? linkedinUrl;
  bool confirmed = false;

  static const requiredKeys = {'displayName', 'dateOfBirth', 'gender'};

  bool canUse(FormProfileField field) {
    if (field.destination == FormProfileDestination.organizerCard) return true;
    if (field.isProfilePhoto) {
      return field.value is List<String> &&
          (field.value! as List<String>).length == 1;
    }
    final definition = field.definition;
    if (definition == null) return false;
    return definition.id == 'linkedinUrl' ||
        (definition.authority == 'privateProfile' &&
            definition.privateProfilePath != 'profilePhotos');
  }

  void select(FormProfileField field, bool keep) {
    if (!canUse(field)) return;
    confirmed = false;
    if (keep) {
      selected.add(field.questionId);
    } else {
      selected.remove(field.questionId);
    }
    if (field.destination == FormProfileDestination.organizerCard ||
        field.isProfilePhoto) {
      return;
    }
    if (field.canonicalFieldId == 'linkedinUrl') {
      linkedinUrl = keep ? field.value as String? : review.currentLinkedinUrl;
      return;
    }
    final key = field.definition!.privateProfilePath!;
    if (keep) {
      final value = normalizeValue(key, field.value, field.options);
      profile[key] = value;
    } else if (review.currentProfile?.containsKey(key) ?? false) {
      profile[key] = review.currentProfile![key];
    } else {
      profile.remove(key);
    }
  }

  void edit(String key, Object? value) {
    profile[key] = value;
    confirmed = false;
  }

  ClaimParticipantFormProfileCallableRequest request(String requestId) =>
      ClaimParticipantFormProfileCallableRequest(
        responseId: review.responseId,
        expectedProfileRevision: review.profileRevision,
        expectedIntakeRevision: review.intakeRevision,
        requestId: requestId,
        termsVersion: review.termsVersion,
        selectedQuestionIds: selected.toList()..sort(),
        profile: Map.of(profile),
        reviewedLinkedinUrl:
            review.fields.any(
              (field) =>
                  selected.contains(field.questionId) &&
                  field.canonicalFieldId == 'linkedinUrl',
            )
            ? linkedinUrl
            : null,
      );

  static Map<String, String> choices(String key) {
    final List<Enum> values = switch (key) {
      'gender' || 'interestedInGenders' => Gender.values,
      'education' => EducationLevel.values,
      'religion' => Religion.values,
      'languages' => Language.values,
      'relationshipGoal' => RelationshipGoal.values,
      'drinking' => DrinkingHabit.values,
      'smoking' => SmokingHabit.values,
      'workout' => WorkoutFrequency.values,
      'diet' => DietaryPreference.values,
      'children' => ChildrenStatus.values,
      _ => const [],
    };
    return {for (final value in values) value.name: (value as Labelled).label};
  }

  static Object? normalizeValue(
    String key,
    Object? value,
    Map<String, String> options,
  ) {
    final values = choices(key);
    String? choice(Object? source) {
      if (source is! String) return null;
      final candidate = (options[source] ?? source).trim().toLowerCase();
      for (final entry in values.entries) {
        if (entry.key.toLowerCase() == source.trim().toLowerCase() ||
            entry.value.toLowerCase() == candidate) {
          return entry.key;
        }
      }
      return null;
    }

    if (key == 'languages' || key == 'interestedInGenders') {
      if (value is! List) return null;
      final normalized = value.map(choice).toList();
      return normalized.any((v) => v == null)
          ? null
          : normalized.cast<String>().toSet().toList();
    }
    if (values.isNotEmpty) return choice(value);
    if (key == 'height') {
      return value is num
          ? (value.isFinite && value == value.truncateToDouble()
                ? value.toInt()
                : null)
          : int.tryParse('$value');
    }
    if (key == 'city' && value is String) return _normalizeCity(value);
    return value is String ? value.trim() : null;
  }

  static String? _normalizeCity(String value) {
    final candidate = value.trim().toLowerCase();
    for (final city in defaultCityOptions) {
      if ([
        city.effectiveMarketId,
        city.label,
        city.name,
        ...city.aliases,
      ].any((v) => v.toLowerCase() == candidate)) {
        return city.effectiveMarketId;
      }
    }
    return RegExp(r'^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(candidate)
        ? candidate
        : null;
  }
}
