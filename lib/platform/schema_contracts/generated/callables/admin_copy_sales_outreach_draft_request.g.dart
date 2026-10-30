// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_outreach_copy_request.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminCopySalesOutreachDraftRequest {
  const AdminCopySalesOutreachDraftRequest({
    required this.requestId,
    required this.draftId,
    required this.expectedContentHash,
  });

  final String requestId;
  final String draftId;
  final String expectedContentHash;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'draftId': draftId,
    'expectedContentHash': expectedContentHash,
  };
}
