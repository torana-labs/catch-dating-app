// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/repair_event_assistance_delivery_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class RepairEventAssistanceDeliveryCallableRequest {
  const RepairEventAssistanceDeliveryCallableRequest({
    required this.command,
    required this.expectedMessageRevision,
    required this.expectedReviewHash,
  });

  final Map<String, Object?> command;
  final int expectedMessageRevision;
  final String expectedReviewHash;

  Map<String, Object?> toJson() => {
    'command': command,
    'expectedMessageRevision': expectedMessageRevision,
    'expectedReviewHash': expectedReviewHash,
  };
}
