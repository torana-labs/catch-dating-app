// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/commit_event_offers_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class CommitEventOffersCallableRequest {
  const CommitEventOffersCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.mode,
    required this.rows,
    required this.requestId,
    required this.planDigest,
  });

  final String organizerId;
  final String eventId;
  final String mode;
  final List<Map<String, Object?>> rows;
  final String requestId;
  final String planDigest;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'mode': mode,
    'rows': rows,
    'requestId': requestId,
    'planDigest': planDigest,
  };
}
