// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_update_safety_settings_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Owner-only. Replaces the report reasons and the safety rules. Reason codes already used on reports keep their meaning, so a reason is switched off (active false) rather than removed.
final class AdminUpdateSafetySettingsCallableRequest {
  const AdminUpdateSafetySettingsCallableRequest({
    required this.reasons,
    required this.restrictOnSevereReport,
    required this.organizerBlockLists,
    required this.organizerReports,
  });

  final List<Map<String, Object?>> reasons;
  final bool restrictOnSevereReport;
  final bool organizerBlockLists;
  final bool organizerReports;

  Map<String, Object?> toJson() => {
    'reasons': reasons,
    'restrictOnSevereReport': restrictOnSevereReport,
    'organizerBlockLists': organizerBlockLists,
    'organizerReports': organizerReports,
  };
}
