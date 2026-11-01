// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_take_account_safety_action_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Warn, restrict, suspend or ban one account. Ops may warn and restrict (7 or 30 days, or until lifted); suspend and ban are owner-only. Suspend and ban sign the person out and cancel their future bookings; a ban also blocks their phone and devices from making a new account. messageToUser is what they see; it never names the reporter. caseTargetPath links the safety case it resolves.
final class AdminTakeAccountSafetyActionCallableRequest {
  const AdminTakeAccountSafetyActionCallableRequest({
    required this.uid,
    required this.kind,
    required this.durationDays,
    required this.reasonCode,
    required this.messageToUser,
    required this.caseTargetPath,
    required this.notifyReporter,
    required this.appealable,
    required this.note,
  });

  final String uid;
  final String kind;
  final int? durationDays;
  final String reasonCode;
  final String messageToUser;
  final String? caseTargetPath;
  final bool notifyReporter;
  final bool appealable;
  final String note;

  Map<String, Object?> toJson() => {
    'uid': uid,
    'kind': kind,
    'durationDays': durationDays,
    'reasonCode': reasonCode,
    'messageToUser': messageToUser,
    'caseTargetPath': caseTargetPath,
    'notifyReporter': notifyReporter,
    'appealable': appealable,
    'note': note,
  };
}
