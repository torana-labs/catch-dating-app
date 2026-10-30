// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_safety_triage_item_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminDecideSafetyTriageItemCallableRequest {
  const AdminDecideSafetyTriageItemCallableRequest({
    required this.targetPath,
    required this.decision,
    required this.note,
  });

  final String targetPath;
  final String decision;
  final String note;

  Map<String, Object?> toJson() => {
    'targetPath': targetPath,
    'decision': decision,
    'note': note,
  };
}
