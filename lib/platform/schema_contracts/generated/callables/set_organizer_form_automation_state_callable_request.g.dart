// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_organizer_form_automation_state_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Enables or disables one form automation revision.
final class SetOrganizerFormAutomationStateCallableRequest {
  const SetOrganizerFormAutomationStateCallableRequest({
    required this.organizerId,
    required this.ruleId,
    required this.expectedRevision,
    required this.enabled,
  });

  final String organizerId;
  final String ruleId;
  final int expectedRevision;
  final bool enabled;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'ruleId': ruleId,
    'expectedRevision': expectedRevision,
    'enabled': enabled,
  };
}
