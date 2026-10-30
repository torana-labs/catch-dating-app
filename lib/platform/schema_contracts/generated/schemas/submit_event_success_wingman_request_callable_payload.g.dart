// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_event_success_wingman_request_payload.schema.json.

const schemaSubmitEventSuccessWingmanRequestCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_event_success_wingman_request_payload.schema.json',
  'title': 'SubmitEventSuccessWingmanRequestCallablePayload',
  'description': 'Callable payload accepted by submitEventSuccessWingmanRequest.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'targetUid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
  },
};
