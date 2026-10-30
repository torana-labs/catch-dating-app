// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/check_in_event_runtime_payload.schema.json.

const schemaCheckInEventRuntimeCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/check_in_event_runtime_payload.schema.json',
  'title': 'CheckInEventRuntimeCallablePayload',
  'description': 'Checks a ready no-download participant into the linked operational attendee row.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRuntimeId',
    'venueSessionToken',
  ],
  'properties': <String, Object?>{
    'publicRuntimeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'venueSessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 2048,
    },
  },
};
