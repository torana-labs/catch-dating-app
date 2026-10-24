// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_approve_organizer_listing_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Staff approve a listing Supply Intake built from a nomination, an organizer's own submission or discovery. One transaction publishes the organizer page claimable and noindex, hidden in the app, records the review decision and receipt, and opens the organizer's Sales account, opportunity, tasks and activity.
final class AdminApproveOrganizerListingCallableRequest {
  const AdminApproveOrganizerListingCallableRequest({
    required this.requestId,
    required this.listingWorkItemId,
    required this.contentHash,
    required this.name,
    required this.publicSlug,
    required this.marketId,
    required this.organizerType,
    required this.checklist,
    required this.note,
  });

  final String requestId;
  final String listingWorkItemId;
  final String contentHash;
  final String name;
  final String publicSlug;
  final String marketId;
  final String organizerType;
  final Map<String, Object?> checklist;
  final String note;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'listingWorkItemId': listingWorkItemId,
    'contentHash': contentHash,
    'name': name,
    'publicSlug': publicSlug,
    'marketId': marketId,
    'organizerType': organizerType,
    'checklist': checklist,
    'note': note,
  };
}
