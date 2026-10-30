// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_form_payments_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only bounded fee ledger for one owned form, independent of the response inbox.
final class ListOrganizerFormPaymentsCallableRequest {
  const ListOrganizerFormPaymentsCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.statuses,
    required this.cursor,
    required this.limit,
  });

  final String organizerId;
  final String formId;
  final List<String> statuses;
  final String? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'statuses': statuses,
    'cursor': cursor,
    'limit': limit,
  };
}
