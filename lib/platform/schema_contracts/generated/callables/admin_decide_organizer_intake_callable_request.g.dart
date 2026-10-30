// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_organizer_intake_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminDecideOrganizerIntake. This records a manual admin review decision for a private organizer-intake candidate.
final class AdminDecideOrganizerIntakeCallableRequest {
  const AdminDecideOrganizerIntakeCallableRequest({
    required this.entityId,
    required this.decision,
    required this.publishStatus,
    required this.indexStatus,
    required this.appVisibility,
    required this.checklist,
    required this.note,
  });

  final String entityId;
  final String decision;
  final String publishStatus;
  final String indexStatus;
  final String appVisibility;
  final Map<String, Object?> checklist;
  final String note;

  Map<String, Object?> toJson() => {
    'entityId': entityId,
    'decision': decision,
    'publishStatus': publishStatus,
    'indexStatus': indexStatus,
    'appVisibility': appVisibility,
    'checklist': checklist,
    'note': note,
  };
}
