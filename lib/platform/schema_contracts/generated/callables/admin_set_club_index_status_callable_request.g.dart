// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_set_club_index_status_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminSetClubIndexStatus.
final class AdminSetClubIndexStatusCallableRequest {
  const AdminSetClubIndexStatusCallableRequest({
    required this.clubId,
    required this.indexStatus,
    required this.checklist,
    this.reviewNote,
  });

  final String clubId;
  final String indexStatus;
  final Map<String, Object?> checklist;
  final String? reviewNote;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'indexStatus': indexStatus,
    'checklist': checklist,
    'reviewNote': ?reviewNote,
  };
}
