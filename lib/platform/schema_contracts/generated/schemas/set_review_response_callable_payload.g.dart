// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_review_response_payload.schema.json.

const schemaSetReviewResponseCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_review_response_payload.schema.json',
  'title': 'SetReviewResponseCallablePayload',
  'description': 'Callable payload accepted by setReviewResponse.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'reviewId',
    'message',
  ],
  'properties': <String, Object?>{
    'reviewId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'message': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
