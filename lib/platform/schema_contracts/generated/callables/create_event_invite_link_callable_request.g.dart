// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_event_invite_link_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createEventInviteLink for Host channels, direct recipients, partners, promoters, or eligible attendee referrers.
final class CreateEventInviteLinkCallableRequest {
  const CreateEventInviteLinkCallableRequest({
    required this.eventId,
    required this.label,
    this.source,
    this.linkKind,
    this.intendedRecipientContactId,
    this.campaignId,
    this.destinationKind,
    this.attributionWindowDays,
  });

  final String eventId;
  final String label;
  final String? source;
  final String? linkKind;
  final String? intendedRecipientContactId;
  final String? campaignId;
  final String? destinationKind;
  final int? attributionWindowDays;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'label': label,
    'source': ?source,
    'linkKind': ?linkKind,
    'intendedRecipientContactId': ?intendedRecipientContactId,
    'campaignId': ?campaignId,
    'destinationKind': ?destinationKind,
    'attributionWindowDays': ?attributionWindowDays,
  };
}
