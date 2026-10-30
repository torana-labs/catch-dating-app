// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/publish_organizer_application_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates or revises and publishes one provider-neutral organizer application form.
final class PublishOrganizerApplicationFormCallableRequest {
  const PublishOrganizerApplicationFormCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.expectedRevision,
    required this.title,
    required this.description,
    required this.defaultTargetKind,
    required this.questions,
    required this.consentCopy,
    required this.consentVersion,
    required this.retentionCopy,
  });

  final String organizerId;
  final String? formId;
  final int? expectedRevision;
  final String title;
  final String? description;
  final String defaultTargetKind;
  final List<Map<String, Object?>> questions;
  final String consentCopy;
  final String consentVersion;
  final String retentionCopy;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'expectedRevision': expectedRevision,
    'title': title,
    'description': description,
    'defaultTargetKind': defaultTargetKind,
    'questions': questions,
    'consentCopy': consentCopy,
    'consentVersion': consentVersion,
    'retentionCopy': retentionCopy,
  };
}
