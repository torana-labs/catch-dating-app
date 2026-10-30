// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_organizer_activations.schema.json.

const schemaHostOrganizerActivationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_organizer_activations.schema.json',
  'title': 'HostOrganizerActivationDocument',
  'description': 'Private Host pilot review and operational activation evidence. No attendee identity or advertising permission.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostOrganizerActivations',
  'x-firestore-path': 'hostOrganizerActivations/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'Host acquisition reviewed pilot workflow',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'organizerId',
    'eventId',
    'receiptId',
    'activatedAt',
    'recordedAt',
    'reviewRevision',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^host_activation_[a-f0-9-]{36}\$',
    },
    'activatedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'recordedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reviewRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
  },
};
