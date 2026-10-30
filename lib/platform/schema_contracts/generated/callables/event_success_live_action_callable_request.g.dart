// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/event_success_live_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-fenced live control action accepted by controlEventSuccessLive.
final class EventSuccessLiveActionCallableRequest {
  const EventSuccessLiveActionCallableRequest({
    required this.eventId,
    required this.expectedRevision,
    required this.action,
    this.activeStepIndex,
    this.roundIndex,
    this.confirmed,
    this.accountabilityAcknowledged,
  });

  final String eventId;
  final int expectedRevision;
  final String action;
  final int? activeStepIndex;
  final int? roundIndex;
  final bool? confirmed;
  final bool? accountabilityAcknowledged;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
    'action': action,
    'activeStepIndex': ?activeStepIndex,
    'roundIndex': ?roundIndex,
    'confirmed': ?confirmed,
    'accountabilityAcknowledged': ?accountabilityAcknowledged,
  };
}
