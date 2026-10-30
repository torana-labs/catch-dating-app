// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/set_event_assignment_feature_consent_response.schema.json.

const schemaSetEventAssignmentFeatureConsentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/set_event_assignment_feature_consent_response.schema.json',
  'title': 'SetEventAssignmentFeatureConsentCallableResponse',
  'description': 'Current exact-purpose participant decision, including replay status.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'featureId',
    'status',
    'revision',
    'receiptId',
    'replayed',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'featureId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'granted',
        'withdrawn',
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
