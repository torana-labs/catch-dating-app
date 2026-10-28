// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_my_host_membership_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Member self-serve: pause billing (suspends entitlements), resume, or cancel at the end of the current period.
final class ManageMyHostMembershipCallableRequest {
  const ManageMyHostMembershipCallableRequest({
    required this.action,
    required this.membershipId,
  });

  final String action;
  final String membershipId;

  Map<String, Object?> toJson() => {
    'action': action,
    'membershipId': membershipId,
  };
}
