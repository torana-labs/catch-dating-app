// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_event_review_payload.schema.json.

const schemaCreateEventReviewCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_event_review_payload.schema.json',
  'title': 'CreateEventReviewCallablePayload',
  'description': 'Callable payload accepted by createEventReview.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'rating',
    'comment',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'rating': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 5,
    },
    'comment': <String, Object?>{
      'type': 'string',
      'maxLength': 1000,
    },
  },
};
