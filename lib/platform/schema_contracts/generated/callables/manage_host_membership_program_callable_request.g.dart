// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_host_membership_program_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Organizer-manager read and control of the organizer's paid membership program: enable with the ready Route account, disable, and host-wide billing pause/resume.
final class ManageHostMembershipProgramCallableRequest {
  const ManageHostMembershipProgramCallableRequest({
    required this.action,
    required this.organizerId,
  });

  final String action;
  final String organizerId;

  Map<String, Object?> toJson() => {
    'action': action,
    'organizerId': organizerId,
  };
}
