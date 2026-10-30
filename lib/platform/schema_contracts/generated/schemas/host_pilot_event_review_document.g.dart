// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_pilot_event_reviews.schema.json.

const schemaHostPilotEventReviewDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_pilot_event_reviews.schema.json',
  'title': 'HostPilotEventReviewDocument',
  'description': 'Private Host pilot review and operational activation evidence. No attendee identity or advertising permission.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostPilotEventReviews',
  'x-firestore-path': 'hostPilotEventReviews/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'Host acquisition reviewed pilot workflow',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'eventId',
    'organizerId',
    'realEvent',
    'revision',
    'reviewedAt',
    'reviewedBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'realEvent': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reviewedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reviewedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
  },
};
