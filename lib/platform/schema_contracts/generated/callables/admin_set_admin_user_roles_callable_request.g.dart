// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_set_admin_user_roles_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminSetAdminUserRolesCallableRequest {
  const AdminSetAdminUserRolesCallableRequest({
    required this.targetUid,
    required this.roles,
    required this.note,
  });

  final String targetUid;
  final List<String> roles;
  final String note;

  Map<String, Object?> toJson() => {
    'targetUid': targetUid,
    'roles': roles,
    'note': note,
  };
}
