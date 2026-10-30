// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_rehearsal_movement_payload.schema.json.

const schemaGetEventRehearsalMovementCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_rehearsal_movement_payload.schema.json',
  'title': 'GetEventRehearsalMovementCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'expectedSetupRevision',
    'scope',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'groupId',
      ],
      'properties': <String, Object?>{
        'groupId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'progressRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 500,
        },
        'beforeRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 501,
        },
      },
    },
    'practiceOperatorId': <String, Object?>{
      'type': 'string',
      'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
    },
  },
};
