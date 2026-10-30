// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_access_application_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminDecideAccessApplicationCallableRequest {
  const AdminDecideAccessApplicationCallableRequest({
    required this.applicationUid,
    required this.decision,
    required this.note,
    this.cohortId,
  });

  final String applicationUid;
  final String decision;
  final String note;
  final String? cohortId;

  Map<String, Object?> toJson() => {
    'applicationUid': applicationUid,
    'decision': decision,
    'note': note,
    'cohortId': ?cohortId,
  };
}
