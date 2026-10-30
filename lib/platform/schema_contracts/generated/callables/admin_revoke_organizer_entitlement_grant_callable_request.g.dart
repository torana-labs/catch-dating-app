// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_revoke_organizer_entitlement_grant_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Admin-authorized revocation of one existing entitlement grant. operationId makes the mutation idempotent across retries; revoke of an unknown or already-revoked grant fails closed.
final class AdminRevokeOrganizerEntitlementGrantCallableRequest {
  const AdminRevokeOrganizerEntitlementGrantCallableRequest({
    required this.organizerId,
    required this.operationId,
    required this.grantId,
    required this.reason,
  });

  final String organizerId;
  final String operationId;
  final String grantId;
  final String reason;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'operationId': operationId,
    'grantId': grantId,
    'reason': reason,
  };
}
