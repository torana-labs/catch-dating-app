// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_safety_appeal_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Decides the one appeal on an account safety action. The reviewer must not be the person who decided the action. keep leaves it in force; reduce replaces it with a lighter step (reduceTo); lift ends it. messageToUser is sent to the person; the reporters are not told.
final class AdminDecideSafetyAppealCallableRequest {
  const AdminDecideSafetyAppealCallableRequest({
    required this.actionId,
    required this.outcome,
    required this.reduceTo,
    required this.messageToUser,
    required this.note,
  });

  final String actionId;
  final String outcome;
  final Map<String, Object?>? reduceTo;
  final String messageToUser;
  final String note;

  Map<String, Object?> toJson() => {
    'actionId': actionId,
    'outcome': outcome,
    'reduceTo': reduceTo,
    'messageToUser': messageToUser,
    'note': note,
  };
}
