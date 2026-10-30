// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/promote_form_communication_intent_response.schema.json.

const schemaPromoteFormCommunicationIntentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/promote_form_communication_intent_response.schema.json',
  'title': 'PromoteFormCommunicationIntentCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
    'promotedPurposes',
    'replayed',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'promotedPurposes': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'organizer:eventOperations',
          'organizer:marketing',
          'catch:marketing',
        ],
      },
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
