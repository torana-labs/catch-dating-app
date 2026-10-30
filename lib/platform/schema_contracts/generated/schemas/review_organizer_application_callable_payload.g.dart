// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/review_organizer_application_payload.schema.json.

const schemaReviewOrganizerApplicationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/review_organizer_application_payload.schema.json',
  'title': 'ReviewOrganizerApplicationCallablePayload',
  'description': 'Optimistic manager review mutation for one organizer application.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'expectedRevision',
    'reviewStatus',
    'reviewNote',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applicationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'reviewStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inReview',
        'approved',
        'waitlisted',
        'declined',
      ],
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2000,
    },
  },
};
