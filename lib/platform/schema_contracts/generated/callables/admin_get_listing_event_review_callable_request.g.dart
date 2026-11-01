// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_listing_event_review_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Reads one imported event of an approved listing for the inbox's publish sheet.
final class AdminGetListingEventReviewCallableRequest {
  const AdminGetListingEventReviewCallableRequest({
    required this.intakeRequestId,
    required this.eventWorkItemId,
  });

  final String intakeRequestId;
  final String eventWorkItemId;

  Map<String, Object?> toJson() => {
    'intakeRequestId': intakeRequestId,
    'eventWorkItemId': eventWorkItemId,
  };
}
