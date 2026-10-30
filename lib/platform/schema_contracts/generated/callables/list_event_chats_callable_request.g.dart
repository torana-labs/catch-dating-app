// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_event_chats_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ListEventChatsCallableRequest {
  const ListEventChatsCallableRequest({
    required this.cursor,
    required this.limit,
  });

  final Map<String, Object?>? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'cursor': cursor,
    'limit': limit,
  };
}
