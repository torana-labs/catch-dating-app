// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_organizer_policy_gap_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminDecideOrganizerPolicyGap. This records a manual product/admin review decision for an organizer intake policy gap without enabling crawls, provider lookups, imports, defaults, or naming migrations.
final class AdminDecideOrganizerPolicyGapCallableRequest {
  const AdminDecideOrganizerPolicyGapCallableRequest({
    required this.gapId,
    required this.decision,
    required this.requiredInputsReviewed,
    required this.checklist,
    required this.note,
  });

  final String gapId;
  final String decision;
  final List<String> requiredInputsReviewed;
  final Map<String, Object?> checklist;
  final String note;

  Map<String, Object?> toJson() => {
    'gapId': gapId,
    'decision': decision,
    'requiredInputsReviewed': requiredInputsReviewed,
    'checklist': checklist,
    'note': note,
  };
}
