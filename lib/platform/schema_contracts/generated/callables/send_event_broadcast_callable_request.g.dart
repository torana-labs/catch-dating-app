// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/send_event_broadcast_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by sendEventBroadcast.
final class SendEventBroadcastCallableRequest {
  const SendEventBroadcastCallableRequest({
    required this.requestId,
    required this.eventId,
    required this.audience,
    required this.body,
  });

  final String requestId;
  final String eventId;
  final String audience;
  final String body;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'eventId': eventId,
    'audience': audience,
    'body': body,
  };
}
