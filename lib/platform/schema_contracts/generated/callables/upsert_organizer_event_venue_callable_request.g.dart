// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_organizer_event_venue_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates, updates, archives, or restores one organizer-owned reusable event venue.
final class UpsertOrganizerEventVenueCallableRequest {
  const UpsertOrganizerEventVenueCallableRequest({
    required this.organizerId,
    this.venueId,
    required this.label,
    required this.meetingLocation,
    this.defaultEventCapacity,
    this.status,
  });

  final String organizerId;
  final String? venueId;
  final String label;
  final Map<String, Object?> meetingLocation;
  final int? defaultEventCapacity;
  final String? status;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'venueId': ?venueId,
    'label': label,
    'meetingLocation': meetingLocation,
    'defaultEventCapacity': ?defaultEventCapacity,
    'status': ?status,
  };
}
