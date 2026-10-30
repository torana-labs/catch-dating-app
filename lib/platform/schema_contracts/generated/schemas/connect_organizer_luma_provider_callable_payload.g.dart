// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/connect_organizer_luma_provider_payload.schema.json.

const schemaConnectOrganizerLumaProviderCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/connect_organizer_luma_provider_payload.schema.json',
  'title': 'ConnectOrganizerLumaProviderCallablePayload',
  'description': 'Connect a calendar-scoped Luma API key and map one Catch event after provider verification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'externalEventId',
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
    'externalEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'apiKey': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 512,
    },
  },
};
