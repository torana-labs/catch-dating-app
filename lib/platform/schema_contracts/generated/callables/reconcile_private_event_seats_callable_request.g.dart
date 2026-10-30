// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/reconcile_private_event_seats_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ReconcilePrivateEventSeatsCallableRequest {
  const ReconcilePrivateEventSeatsCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.reviewedDefaultsHash,
    required this.details,
    this.discard,
  });

  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final String reviewedDefaultsHash;
  final Map<String, Object?> details;
  final bool? discard;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedSetupRevision': expectedSetupRevision,
    'reviewedDefaultsHash': reviewedDefaultsHash,
    'details': details,
    'discard': ?discard,
  };
}
