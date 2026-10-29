import 'dart:math' as math;

import 'package:catch_dating_app/core/schema_contracts/generated/profile_schema_contracts.g.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

const minimumProfileAge = schemaMinimumProfileAge;
const preferredMatchAgeOpenEndedDisplayAge = 60;
const maximumPreferredMatchAge = schemaMaximumPreferredMatchAge;
const minimumHeightCm = schemaMinimumHeightCm;
const maximumHeightCm = schemaMaximumHeightCm;
const defaultHeightCm = 170;
const maximumProfilePromptAnswerLength = schemaMaximumProfilePromptAnswerLength;
const maximumPhotoPromptCaptionLength = schemaMaximumPhotoPromptCaptionLength;
const maximumDisplayNameLength = 80;
const maximumProfileEmailLength = 320;
const maximumProfileShortTextLength = 120;
const maximumConsecutivePromptNewlines = 2;
final RegExp _stackedPromptNewlinePattern = RegExp(r'\n[ \t]*\n[ \t]*\n+');
final RegExp _stackedPromptNewlineCollapsePattern = RegExp(
  r'\n[ \t]*\n(?:[ \t]*\n)+',
);

int calculateAge(DateTime dateOfBirth, {required DateTime today}) {
  int age = today.year - dateOfBirth.year;
  if (today.month < dateOfBirth.month ||
      (today.month == dateOfBirth.month && today.day < dateOfBirth.day)) {
    age--;
  }
  return age;
}

DateTime latestAllowedDateOfBirth({
  int minimumAge = minimumProfileAge,
  required DateTime today,
}) {
  return DateTime(today.year - minimumAge, today.month, today.day);
}

bool isAtLeastAge(
  DateTime dateOfBirth, {
  int minimumAge = minimumProfileAge,
  required DateTime today,
}) {
  final normalizedDob = DateTime(
    dateOfBirth.year,
    dateOfBirth.month,
    dateOfBirth.day,
  );
  return !normalizedDob.isAfter(
    latestAllowedDateOfBirth(minimumAge: minimumAge, today: today),
  );
}

String? validateRequiredProfileName(String? value, {required String label}) {
  final text = (value ?? '').trim();
  if (text.isEmpty) {
    return '$label${StructuredDomainCopy.profileValidationRequiredSuffix}';
  }
  return null;
}

String? validateRequiredDisplayName(String? value) {
  final requiredError = validateRequiredProfileName(
    value,
    label: StructuredDomainCopy.profileValidationDisplayName,
  );
  if (requiredError != null) return requiredError;
  return validateProfileTextMaxLength(
    value,
    label: StructuredDomainCopy.profileValidationDisplayName,
    maxLength: maximumDisplayNameLength,
  );
}

String? validateRequiredPhoneNumber(String? value) {
  if ((value ?? '').trim().isEmpty) {
    return '${StructuredDomainCopy.profileValidationPhone}'
        '${StructuredDomainCopy.profileValidationRequiredSuffix}';
  }
  return null;
}

String? validateOptionalEmail(String? value) {
  final email = (value ?? '').trim();
  if (email.isEmpty) return null;
  final lengthError = validateProfileTextMaxLength(
    email,
    label: StructuredDomainCopy.profileValidationEmail,
    maxLength: maximumProfileEmailLength,
  );
  if (lengthError != null) return lengthError;
  final valid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  return valid ? null : StructuredDomainCopy.profileValidationInvalidEmail;
}

String? validateProfileTextMaxLength(
  String? value, {
  required String label,
  required int maxLength,
}) {
  final text = (value ?? '').trim();
  if (text.length <= maxLength) return null;
  return '$label${StructuredDomainCopy.profileValidationMaxLengthInfix}'
      '$maxLength${StructuredDomainCopy.profileValidationCharactersOrFewerSuffix}';
}

String? validateOptionalProfileShortText(
  String? value, {
  required String label,
}) {
  return validateProfileTextMaxLength(
    value,
    label: label,
    maxLength: maximumProfileShortTextLength,
  );
}

String? validateOptionalProfilePromptAnswer(String? value) {
  final answer = collapseStackedPromptBlankLines(value ?? '').trim();
  if (answer.length > maximumProfilePromptAnswerLength) {
    return '${StructuredDomainCopy.profileValidationPrompt}'
        '${StructuredDomainCopy.profileValidationMaxLengthInfix}'
        '$maximumProfilePromptAnswerLength'
        '${StructuredDomainCopy.profileValidationCharactersOrFewerSuffix}';
  }
  return null;
}

String? validateOptionalPhotoPromptCaption(String? value) {
  final caption = collapseStackedPromptBlankLines(value ?? '').trim();
  if (caption.length > maximumPhotoPromptCaptionLength) {
    return '${StructuredDomainCopy.profileValidationCaption}'
        '${StructuredDomainCopy.profileValidationMaxLengthInfix}'
        '$maximumPhotoPromptCaptionLength'
        '${StructuredDomainCopy.profileValidationCharactersOrFewerSuffix}';
  }
  return null;
}

String normalizePromptLineEndings(String value) =>
    value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');

String collapseStackedPromptBlankLines(String value) {
  return normalizePromptLineEndings(
    value,
  ).replaceAll(_stackedPromptNewlineCollapsePattern, '\n\n');
}

bool hasStackedPromptBlankLines(String value) =>
    _stackedPromptNewlinePattern.hasMatch(normalizePromptLineEndings(value));

String normalizeInstagramHandle(String value) {
  final trimmed = value.trim();
  final withoutAt = trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;
  return withoutAt.trim();
}

String? validateOptionalInstagramHandle(String? value) {
  final handle = normalizeInstagramHandle(value ?? '');
  if (handle.isEmpty) return null;
  final valid = RegExp(r'^[A-Za-z0-9._]{1,30}$').hasMatch(handle);
  return valid ? null : StructuredDomainCopy.profileValidationInvalidInstagram;
}

/// Account birthdays are optional; age limits belong to the requested feature.
String? validateOptionalDateOfBirth(
  DateTime? dateOfBirth, {
  required DateTime today,
}) {
  if (dateOfBirth == null) return null;
  return isAtLeastAge(dateOfBirth, minimumAge: 0, today: today)
      ? null
      : StructuredDomainCopy.profileValidationSelectDateOfBirth;
}

String? validateRequiredDateOfBirth(
  DateTime? dateOfBirth, {
  required DateTime today,
}) {
  if (dateOfBirth == null) {
    return StructuredDomainCopy.profileValidationSelectDateOfBirth;
  }
  if (!isAtLeastAge(dateOfBirth, today: today)) {
    return '${StructuredDomainCopy.profileValidationMinimumAgePrefix}'
        '$minimumProfileAge${StructuredDomainCopy.profileValidationYearsOldSuffix}';
  }
  return null;
}

String? validateOptionalHeightCm(int? heightCm) {
  if (heightCm == null) {
    return null;
  }
  if (heightCm < minimumHeightCm) {
    return '${StructuredDomainCopy.profileValidationHeightMinimumPrefix}'
        '$minimumHeightCm${StructuredDomainCopy.profileValidationCentimetresSuffix}';
  }
  if (heightCm > maximumHeightCm) {
    return '${StructuredDomainCopy.profileValidationHeightMaximumPrefix}'
        '$maximumHeightCm${StructuredDomainCopy.profileValidationCentimetresSuffix}';
  }
  return null;
}

int normalizeHeightCm(int? heightCm) =>
    (heightCm ?? defaultHeightCm).clamp(minimumHeightCm, maximumHeightCm);

({int minAge, int maxAge}) normalizeAgePreferenceRange({
  required int minAgePreference,
  required int maxAgePreference,
  int minimumAge = minimumProfileAge,
  int maximumAge = maximumPreferredMatchAge,
}) {
  final normalizedMin = math
      .min(minAgePreference, maxAgePreference)
      .clamp(minimumAge, maximumAge);
  final normalizedMax = math
      .max(minAgePreference, maxAgePreference)
      .clamp(normalizedMin, maximumAge);

  return (minAge: normalizedMin, maxAge: normalizedMax);
}

String formatPreferredMatchAge(int age) =>
    age >= preferredMatchAgeOpenEndedDisplayAge
    ? '$preferredMatchAgeOpenEndedDisplayAge+'
    : '$age';

int preferredMatchAgeStorageValue(int displayAge) =>
    displayAge >= preferredMatchAgeOpenEndedDisplayAge
    ? maximumPreferredMatchAge
    : displayAge;

String formatPreferredMatchAgeRange({
  required int minAgePreference,
  required int maxAgePreference,
}) {
  final range = normalizeAgePreferenceRange(
    minAgePreference: minAgePreference,
    maxAgePreference: maxAgePreference,
  );
  return '${range.minAge} – ${formatPreferredMatchAge(range.maxAge)}';
}
