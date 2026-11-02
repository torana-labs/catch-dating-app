// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_organizer_listing_review_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// One Supply Intake listing awaiting approval, by its request, with what a reviewer needs to approve it.
final class AdminGetOrganizerListingReviewCallableRequest {
  const AdminGetOrganizerListingReviewCallableRequest({
    required this.requestId,
  });

  final String requestId;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
  };
}
