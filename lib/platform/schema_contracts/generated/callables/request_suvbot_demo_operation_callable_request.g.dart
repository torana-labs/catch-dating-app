// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/request_suvbot_demo_operation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by requestSuvbotDemoOperation. Demo-only operations triggered from the Suvbot conversation surface.
final class RequestSuvbotDemoOperationCallableRequest {
  const RequestSuvbotDemoOperationCallableRequest({
    required this.action,
    this.text,
  });

  final String action;
  final String? text;

  Map<String, Object?> toJson() => {
    'action': action,
    'text': ?text,
  };
}
