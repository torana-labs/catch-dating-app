// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_event_approval_notifications_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ManageEventApprovalNotificationsCallableRequest {
  const ManageEventApprovalNotificationsCallableRequest({
    required this.eventId,
    required this.action,
    this.expectedRevision,
    this.choices,
    this.termsVersion,
    required this.expectedUid,
  });

  final String eventId;
  final String action;
  final int? expectedRevision;
  final Map<String, Object?>? choices;
  final String? termsVersion;
  final String expectedUid;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'action': action,
    'expectedRevision': ?expectedRevision,
    'choices': ?choices,
    'termsVersion': ?termsVersion,
    'expectedUid': expectedUid,
  };
}
