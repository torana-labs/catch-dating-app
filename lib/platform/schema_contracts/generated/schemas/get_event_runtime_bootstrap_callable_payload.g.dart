// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_runtime_bootstrap_payload.schema.json.

const schemaGetEventRuntimeBootstrapCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_runtime_bootstrap_payload.schema.json',
  'title': 'GetEventRuntimeBootstrapCallablePayload',
  'description': 'Opaque public Event Success runtime lookup.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRuntimeId',
  ],
  'properties': <String, Object?>{
    'publicRuntimeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
  },
};
