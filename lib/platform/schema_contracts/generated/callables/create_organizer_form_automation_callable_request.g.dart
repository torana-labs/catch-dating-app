// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_form_automation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates or replaces an explicit form automation under an optimistic revision guard.
final class CreateOrganizerFormAutomationCallableRequest {
  const CreateOrganizerFormAutomationCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.ruleId,
    required this.requestId,
    required this.expectedRevision,
    required this.name,
    required this.enabled,
    required this.trigger,
    required this.condition,
    required this.actions,
    this.triggerEventId,
    this.delayMinutes,
  });

  final String organizerId;
  final String? formId;
  final String? ruleId;
  final String requestId;
  final int? expectedRevision;
  final String name;
  final bool enabled;
  final String trigger;
  final Map<String, Object?>? condition;
  final List<Map<String, Object?>> actions;
  final String? triggerEventId;
  final int? delayMinutes;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'ruleId': ruleId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'name': name,
    'enabled': enabled,
    'trigger': trigger,
    'condition': condition,
    'actions': actions,
    'triggerEventId': ?triggerEventId,
    'delayMinutes': ?delayMinutes,
  };
}
