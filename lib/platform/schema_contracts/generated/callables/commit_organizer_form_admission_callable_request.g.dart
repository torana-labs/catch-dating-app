// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/commit_organizer_form_admission_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class CommitOrganizerFormAdmissionCallableRequest {
  const CommitOrganizerFormAdmissionCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.responseId,
    required this.contactId,
    required this.offerId,
    required this.expectedOfferRevision,
    required this.expectedOfferGeneration,
    required this.expectedLedgerRevision,
    required this.requestId,
  });

  final String organizerId;
  final String eventId;
  final String responseId;
  final String contactId;
  final String offerId;
  final int expectedOfferRevision;
  final int expectedOfferGeneration;
  final int expectedLedgerRevision;
  final String requestId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'responseId': responseId,
    'contactId': contactId,
    'offerId': offerId,
    'expectedOfferRevision': expectedOfferRevision,
    'expectedOfferGeneration': expectedOfferGeneration,
    'expectedLedgerRevision': expectedLedgerRevision,
    'requestId': requestId,
  };
}
