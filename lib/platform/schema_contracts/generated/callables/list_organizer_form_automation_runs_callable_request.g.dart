// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_form_automation_runs_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized automation rule and bounded run history query.
final class ListOrganizerFormAutomationRunsCallableRequest {
  const ListOrganizerFormAutomationRunsCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.ruleId,
    required this.cursor,
    required this.limit,
  });

  final String organizerId;
  final String? formId;
  final String? ruleId;
  final String? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'ruleId': ruleId,
    'cursor': cursor,
    'limit': limit,
  };
}
