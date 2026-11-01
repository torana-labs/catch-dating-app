// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_lift_account_safety_action_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lift one active account safety action early. Ops may lift warnings and restrictions; lifting a suspension or ban is owner-only (or the appeal reviewer, through adminDecideSafetyAppeal).
final class AdminLiftAccountSafetyActionCallableRequest {
  const AdminLiftAccountSafetyActionCallableRequest({
    required this.actionId,
    required this.note,
  });

  final String actionId;
  final String note;

  Map<String, Object?> toJson() => {
    'actionId': actionId,
    'note': note,
  };
}
