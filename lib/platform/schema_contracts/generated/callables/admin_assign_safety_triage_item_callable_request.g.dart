// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_assign_safety_triage_item_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminAssignSafetyTriageItemCallableRequest {
  const AdminAssignSafetyTriageItemCallableRequest({
    required this.targetPath,
    required this.assigneeUid,
    required this.note,
  });

  final String targetPath;
  final String? assigneeUid;
  final String note;

  Map<String, Object?> toJson() => {
    'targetPath': targetPath,
    'assigneeUid': assigneeUid,
    'note': note,
  };
}
