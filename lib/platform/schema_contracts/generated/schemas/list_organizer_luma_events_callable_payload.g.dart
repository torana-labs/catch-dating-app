// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_luma_events_payload.schema.json.

const schemaListOrganizerLumaEventsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_luma_events_payload.schema.json',
  'title': 'ListOrganizerLumaEventsCallablePayload',
  'description': 'Manager request to verify a calendar-scoped Luma API key and list manageable events without persisting the key.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'apiKey',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'apiKey': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 512,
    },
  },
};
