// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_update_inbox_item_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Assign, unassign, snooze or wake one Admin inbox item; audited and recorded in its journey.
final class AdminUpdateInboxItemCallableRequest {
  const AdminUpdateInboxItemCallableRequest({
    required this.itemId,
    required this.action,
    required this.assigneeUid,
    required this.snoozedUntil,
    required this.note,
  });

  final String itemId;
  final String action;
  final String? assigneeUid;
  final String? snoozedUntil;
  final String? note;

  Map<String, Object?> toJson() => {
    'itemId': itemId,
    'action': action,
    'assigneeUid': assigneeUid,
    'snoozedUntil': snoozedUntil,
    'note': note,
  };
}
