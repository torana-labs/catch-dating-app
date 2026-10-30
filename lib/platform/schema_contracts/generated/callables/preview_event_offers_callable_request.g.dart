// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/preview_event_offers_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class PreviewEventOffersCallableRequest {
  const PreviewEventOffersCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.mode,
    required this.rows,
  });

  final String organizerId;
  final String eventId;
  final String mode;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'mode': mode,
    'rows': rows,
  };
}
