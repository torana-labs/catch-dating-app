// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/publish_event_success_rotation_round_payload.schema.json.

const schemaPublishEventSuccessRotationRoundCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/publish_event_success_rotation_round_payload.schema.json',
  'title': 'PublishEventSuccessRotationRoundCallablePayload',
  'description': 'Confirmed revision-fenced publication of one precomputed guided-rotation round.',
  'x-callable-aliases': <Object?>[
    'publishEventSuccessRotationRound',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
    'roundIndex',
    'confirmed',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'roundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
    'confirmed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
