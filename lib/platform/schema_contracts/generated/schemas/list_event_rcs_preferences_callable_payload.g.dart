// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_event_rcs_preferences_payload.schema.json.

const schemaListEventRcsPreferencesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  '\$id': 'https://catch.app/contracts/callables/list_event_rcs_preferences_payload.schema.json',
  'title': 'ListEventRcsPreferencesCallablePayload',
  'required': <Object?>[
    'eventId',
    'attendeeId',
    'cursor',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^rcs-permission:[a-f0-9]{64}\$',
    },
  },
};
