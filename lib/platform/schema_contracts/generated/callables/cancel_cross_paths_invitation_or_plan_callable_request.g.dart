// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/cancel_cross_paths_invitation_or_plan_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Participant cancellation accepted by cancelCrossPathsInvitationOrPlan.
final class CancelCrossPathsInvitationOrPlanCallableRequest {
  const CancelCrossPathsInvitationOrPlanCallableRequest({
    required this.invitationId,
  });

  final String invitationId;

  Map<String, Object?> toJson() => {
    'invitationId': invitationId,
  };
}
