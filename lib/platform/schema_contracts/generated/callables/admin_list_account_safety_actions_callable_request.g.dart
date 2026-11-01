// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_account_safety_actions_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists account safety actions for the Safety queue: those in force, those with an appeal waiting, or the most recent of any status. Optionally for one account.
final class AdminListAccountSafetyActionsCallableRequest {
  const AdminListAccountSafetyActionsCallableRequest({
    required this.view,
    required this.uid,
    required this.limit,
  });

  final String view;
  final String? uid;
  final int limit;

  Map<String, Object?> toJson() => {
    'view': view,
    'uid': uid,
    'limit': limit,
  };
}
