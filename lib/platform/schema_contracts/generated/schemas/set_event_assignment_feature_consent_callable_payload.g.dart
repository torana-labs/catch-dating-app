// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_assignment_feature_consent_payload.schema.json.

const schemaSetEventAssignmentFeatureConsentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_event_assignment_feature_consent_payload.schema.json',
  'title': 'SetEventAssignmentFeatureConsentCallablePayload',
  'description': 'Verified participant grants or withdraws assignment-only use of one exact submitted answer.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'featureId',
    'responseId',
    'decision',
    'expectedRevision',
    'requestId',
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
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decision': <String, Object?>{
      'enum': <Object?>[
        'grant',
        'withdraw',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
