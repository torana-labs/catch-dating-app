// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_event_assistance_cases_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ListEventAssistanceCasesCallableRequest {
  const ListEventAssistanceCasesCallableRequest({
    required this.context,
    required this.status,
    required this.cursor,
  });

  final Map<String, Object?> context;
  final String status;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'context': context,
    'status': status,
    'cursor': cursor,
  };
}
