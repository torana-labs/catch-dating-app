// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_public_club_review_payload.schema.json.

const schemaCreatePublicClubReviewCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_public_club_review_payload.schema.json',
  'title': 'CreatePublicClubReviewCallablePayload',
  'description': 'Callable payload accepted by createPublicClubReview for unverified public organizer listing reviews.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'rating',
    'comment',
    'reviewerName',
    'isAnonymous',
    'submittedFromPath',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
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
      'minLength': 1,
      'maxLength': 1000,
    },
    'reviewerName': <String, Object?>{
      'type': 'string',
      'maxLength': 120,
    },
    'isAnonymous': <String, Object?>{
      'type': 'boolean',
    },
    'submittedFromPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
  },
};
