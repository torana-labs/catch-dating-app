// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/review_organizer_application_response.schema.json.

const schemaReviewOrganizerApplicationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/review_organizer_application_response.schema.json',
  'title': 'ReviewOrganizerApplicationCallableResponse',
  'description': 'Updated organizer application review identity and revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'reviewStatus',
    'reviewedAtMillis',
    'revision',
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
    'reviewStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inReview',
        'approved',
        'waitlisted',
        'declined',
      ],
    },
    'reviewedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
      'maximum': 9007199254740991,
    },
    'contactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
