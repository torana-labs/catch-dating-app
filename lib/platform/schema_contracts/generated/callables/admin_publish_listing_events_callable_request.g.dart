// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_publish_listing_events_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// A staff member publishes, or dry-runs, some or all of the events Supply Intake imported for one approved organizer listing as read-only, outbound-only externalEvents. Each event is planned and checked on its own; blocked events are reported, not written. Their resolutions or cited policy waivers clear governed blockers per event.
final class AdminPublishListingEventsCallableRequest {
  const AdminPublishListingEventsCallableRequest({
    required this.intakeRequestId,
    required this.eventWorkItemIds,
    required this.executionMode,
    required this.idempotencyKey,
    required this.reviewNote,
    required this.checklist,
    required this.blockerResolutions,
    this.eventLocations,
  });

  final String intakeRequestId;
  final List<String> eventWorkItemIds;
  final String executionMode;
  final String idempotencyKey;
  final String reviewNote;
  final Map<String, Object?> checklist;
  final List<Map<String, Object?>> blockerResolutions;
  final List<Map<String, Object?>>? eventLocations;

  Map<String, Object?> toJson() => {
    'intakeRequestId': intakeRequestId,
    'eventWorkItemIds': eventWorkItemIds,
    'executionMode': executionMode,
    'idempotencyKey': idempotencyKey,
    'reviewNote': reviewNote,
    'checklist': checklist,
    'blockerResolutions': blockerResolutions,
    'eventLocations': ?eventLocations,
  };
}
