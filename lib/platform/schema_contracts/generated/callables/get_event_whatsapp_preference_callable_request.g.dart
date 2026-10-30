// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_whatsapp_preference_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventWhatsappPreferenceCallableRequest {
  const GetEventWhatsappPreferenceCallableRequest({
    required this.eventId,
    required this.attendeeId,
    required this.senderId,
  });

  final String eventId;
  final String attendeeId;
  final String senderId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'attendeeId': attendeeId,
    'senderId': senderId,
  };
}
