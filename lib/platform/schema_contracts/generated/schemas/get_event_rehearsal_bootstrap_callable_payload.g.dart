// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_rehearsal_bootstrap_payload.schema.json.

const schemaGetEventRehearsalBootstrapCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_rehearsal_bootstrap_payload.schema.json',
  'title': 'GetEventRehearsalBootstrapCallablePayload',
  'description': 'Returns Host-safe rehearsal state.',
  'x-callable-aliases': <Object?>[
    'completeEventRehearsal',
    'exportEventRehearsalReproduction',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'practiceOperatorId': <String, Object?>{
      'type': 'string',
      'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
    },
  },
};
