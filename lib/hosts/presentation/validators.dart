import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:flutter/material.dart';

/// Returns null if [value] is empty or null; otherwise validates that the
/// trimmed value is a positive integer >= 1.
String? positiveOptionalValidator(String? value, AppLocalizations l10n) {
  if (value == null || value.trim().isEmpty) return null;
  final n = int.tryParse(value.trim());
  if (n == null || n < 1) return l10n.sharedValidationMinimumOne;
  return null;
}

/// Returns 'Required' if [value] is empty or null; otherwise validates that
/// the trimmed value is a positive integer >= 1.
String? positiveRequiredValidator(String? value, AppLocalizations l10n) {
  if (value == null || value.trim().isEmpty) {
    return l10n.sharedValidationRequired;
  }
  final n = int.tryParse(value.trim());
  if (n == null || n < 1) return l10n.sharedValidationMinimumOne;
  return null;
}

/// Validates an invite code: non-empty, 4-64 characters.
String? inviteCodeValidator(String? value, AppLocalizations l10n) {
  final code = value?.trim() ?? '';
  if (code.isEmpty) return l10n.sharedValidationRequired;
  if (code.length < 4) return l10n.sharedValidationInviteCodeMinimum;
  if (code.length > 64) return l10n.sharedValidationInviteCodeMaximum;
  return null;
}

/// Validates an age range field (min/max). Returns null on empty or valid age.
///
/// [siblingController] holds the paired min or max value so that cross-field
/// constraints can be checked (e.g. min <= max).
String? validateAge(
  String? value, {
  required AppLocalizations l10n,
  required TextEditingController siblingController,
  required bool isMinimum,
}) {
  if (value == null || value.trim().isEmpty) return null;

  final parsedValue = int.tryParse(value.trim());
  if (parsedValue == null || parsedValue < 18 || parsedValue > 99) {
    return l10n.sharedValidationAgeRange;
  }

  final siblingValue = int.tryParse(siblingController.text.trim());
  if (siblingValue == null) return null;

  if (isMinimum && parsedValue > siblingValue) {
    return l10n.sharedValidationMinimumAtMostMaximum;
  }
  if (!isMinimum && parsedValue < siblingValue) {
    return l10n.sharedValidationMaximumAtLeastMinimum;
  }
  return null;
}

/// Resolves an [EventCancellationPolicyId] to its [EventCancellationPolicy].
EventCancellationPolicy policyFor(EventCancellationPolicyId id) {
  return switch (id) {
    EventCancellationPolicyId.notApplicable =>
      const EventCancellationPolicy.notApplicable(),
    EventCancellationPolicyId.flexible =>
      const EventCancellationPolicy.flexible(),
    EventCancellationPolicyId.standard =>
      const EventCancellationPolicy.standard(),
    EventCancellationPolicyId.strict => const EventCancellationPolicy.strict(),
  };
}
