// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/respond_cross_paths_invitation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Recipient-only response accepted by respondCrossPathsInvitation.
final class RespondCrossPathsInvitationCallableRequest {
  const RespondCrossPathsInvitationCallableRequest({
    required this.invitationId,
    required this.decision,
  });

  final String invitationId;
  final String decision;

  Map<String, Object?> toJson() => {
    'invitationId': invitationId,
    'decision': decision,
  };
}
