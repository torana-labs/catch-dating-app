// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/withdraw_organizer_form_response_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Idempotently withdraws one submitted response under respondent authority.
final class WithdrawOrganizerFormResponseCallableRequest {
  const WithdrawOrganizerFormResponseCallableRequest({
    required this.responseId,
    required this.withdrawalToken,
    required this.requestId,
  });

  final String responseId;
  final String? withdrawalToken;
  final String requestId;

  Map<String, Object?> toJson() => {
    'responseId': responseId,
    'withdrawalToken': withdrawalToken,
    'requestId': requestId,
  };
}
