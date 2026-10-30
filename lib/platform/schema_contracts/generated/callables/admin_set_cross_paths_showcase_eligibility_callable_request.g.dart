// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_set_cross_paths_showcase_eligibility_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload for an audited human Cross Paths showcase eligibility decision.
final class AdminSetCrossPathsShowcaseEligibilityCallableRequest {
  const AdminSetCrossPathsShowcaseEligibilityCallableRequest({
    required this.uid,
    required this.status,
    required this.reviewChecklist,
    required this.reviewNote,
  });

  final String uid;
  final String status;
  final Map<String, Object?> reviewChecklist;
  final String reviewNote;

  Map<String, Object?> toJson() => {
    'uid': uid,
    'status': status,
    'reviewChecklist': reviewChecklist,
    'reviewNote': reviewNote,
  };
}
