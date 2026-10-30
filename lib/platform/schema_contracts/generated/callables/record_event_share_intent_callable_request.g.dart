// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_event_share_intent_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Records that a signed-in actor opened a Catch share surface. It never claims a message was sent or forwarded.
final class RecordEventShareIntentCallableRequest {
  const RecordEventShareIntentCallableRequest({
    required this.eventId,
    required this.inviteLinkId,
    required this.surface,
    this.creativeId,
    this.channelHint,
  });

  final String eventId;
  final String inviteLinkId;
  final String surface;
  final String? creativeId;
  final String? channelHint;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteLinkId': inviteLinkId,
    'surface': surface,
    'creativeId': ?creativeId,
    'channelHint': ?channelHint,
  };
}
