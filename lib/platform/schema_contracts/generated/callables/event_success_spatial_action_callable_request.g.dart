// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/event_success_spatial_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-fenced Host spatial-control action.
final class EventSuccessSpatialActionCallableRequest {
  const EventSuccessSpatialActionCallableRequest({
    required this.eventId,
    required this.expectedRevision,
    required this.action,
    required this.moduleId,
    required this.uid,
    this.destinationUnitId,
    this.scope,
  });

  final String eventId;
  final int expectedRevision;
  final String action;
  final String moduleId;
  final String uid;
  final String? destinationUnitId;
  final String? scope;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
    'action': action,
    'moduleId': moduleId,
    'uid': uid,
    'destinationUnitId': ?destinationUnitId,
    'scope': ?scope,
  };
}
