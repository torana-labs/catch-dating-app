// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/resolve_organizer_communication_plan_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized request for one intent-aware organizer communication plan.
final class ResolveOrganizerCommunicationPlanCallableRequest {
  const ResolveOrganizerCommunicationPlanCallableRequest({
    required this.organizerId,
    required this.intent,
    required this.target,
  });

  final String organizerId;
  final String intent;
  final Map<String, Object?> target;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'intent': intent,
    'target': target,
  };
}
