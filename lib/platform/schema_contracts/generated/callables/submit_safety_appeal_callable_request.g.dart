// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_safety_appeal_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// The account appeals one safety action taken against it. Each action can be appealed once.
final class SubmitSafetyAppealCallableRequest {
  const SubmitSafetyAppealCallableRequest({
    required this.actionId,
    required this.text,
  });

  final String actionId;
  final String text;

  Map<String, Object?> toJson() => {
    'actionId': actionId,
    'text': text,
  };
}
