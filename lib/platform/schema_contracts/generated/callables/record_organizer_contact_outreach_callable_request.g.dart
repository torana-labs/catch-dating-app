// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_organizer_contact_outreach_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized request to log one outreach attempt on an organizer contact. An omitted occurredAtMillis records the attempt at server receipt; explicit times may not be in the future.
final class RecordOrganizerContactOutreachCallableRequest {
  const RecordOrganizerContactOutreachCallableRequest({
    required this.organizerId,
    required this.contactId,
    required this.channel,
    required this.outcome,
    this.note,
    this.occurredAtMillis,
  });

  final String organizerId;
  final String contactId;
  final String channel;
  final String outcome;
  final String? note;
  final int? occurredAtMillis;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
    'channel': channel,
    'outcome': outcome,
    'note': ?note,
    'occurredAtMillis': ?occurredAtMillis,
  };
}
