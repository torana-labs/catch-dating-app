// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/read_public_organizer_tracking_settings_payload.schema.json.

const schemaReadPublicOrganizerTrackingSettingsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/read_public_organizer_tracking_settings_payload.schema.json',
  'title': 'ReadPublicOrganizerTrackingSettingsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
  },
};
