// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_event_success_conversation_graph_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Authenticated attendee submission for the end-of-event conversation graph.
final class SubmitEventSuccessConversationGraphCallableRequest {
  const SubmitEventSuccessConversationGraphCallableRequest({
    required this.eventId,
    required this.selectedUids,
    required this.skipped,
  });

  final String eventId;
  final List<String> selectedUids;
  final bool skipped;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'selectedUids': selectedUids,
    'skipped': skipped,
  };
}
