// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/configure_event_assignment_features_response.schema.json.

const schemaConfigureEventAssignmentFeaturesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/configure_event_assignment_features_response.schema.json',
  'title': 'ConfigureEventAssignmentFeaturesCallableResponse',
  'description': 'Saved soft-feature configuration revision, never a participant authorization.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'revision',
    'replayed',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
