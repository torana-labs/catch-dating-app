part of '../host_operations_screen.dart';

String _valueOrDash(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? '—' : trimmed;
}

String _admissionDefaultLabel(
  EventAdmissionDefaultPreset preset,
  AppLocalizations l10n,
) {
  return switch (preset) {
    EventAdmissionDefaultPreset.openCapacity =>
      l10n.hostsCreateEventPolicyStateTitleOpenCapacity,
    EventAdmissionDefaultPreset.inviteOnly =>
      l10n.hostsCreateEventPolicyStateTitleInviteOnly,
    EventAdmissionDefaultPreset.balancedSingles =>
      l10n.hostsCreateEventPolicyStateTitleBalancedSingles,
    EventAdmissionDefaultPreset.fixedCohortCaps =>
      l10n.hostsAdmissionFixedCohortCapsLabel,
  };
}

String _admissionDefaultDescription(
  EventAdmissionDefaultPreset preset,
  AppLocalizations l10n,
) {
  return switch (preset) {
    EventAdmissionDefaultPreset.openCapacity =>
      l10n.hostsAdmissionOpenCapacityDescription,
    EventAdmissionDefaultPreset.inviteOnly =>
      l10n.hostsAdmissionInviteOnlyDescription,
    EventAdmissionDefaultPreset.balancedSingles =>
      l10n.hostsAdmissionBalancedSinglesDescription,
    EventAdmissionDefaultPreset.fixedCohortCaps =>
      l10n.hostsAdmissionFixedCohortCapsDescription,
  };
}

OrganizerHostDefaults _hostDefaultsWithActivity(
  OrganizerHostDefaults defaults,
  ActivityKind activityKind,
) {
  final supported =
      defaults.effectiveSupportedActivityKinds.contains(activityKind)
      ? defaults.supportedActivityKinds
      : [...defaults.supportedActivityKinds, activityKind];
  return defaults.copyWith(
    primaryActivityKind: activityKind,
    supportedActivityKinds: supported,
  );
}

String _normalizeSingleLineInput(String value) {
  return value.trim().replaceAll(RegExp(r'\s+'), ' ');
}

String _normalizeMultilineInput(String value) {
  return value
      .trim()
      .replaceAll(RegExp(r'[ \t]+\n'), '\n')
      .replaceAll(RegExp(r'\n{3,}'), '\n\n');
}

String? _optionalEmailValidator(String? value, AppLocalizations l10n) {
  final trimmed = value?.trim() ?? '';
  if (trimmed.isEmpty) return null;
  final valid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(trimmed);
  return valid ? null : l10n.hostsValidationEnterValidEmail;
}

Object? _optionalStringFieldValue(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
