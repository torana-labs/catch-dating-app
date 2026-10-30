// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/configure_event_offer_preferences_response.schema.json.

const schemaConfigureEventOfferPreferencesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/configure_event_offer_preferences_response.schema.json',
  'title': 'ConfigureEventOfferPreferencesCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'preferencesRevision',
    'replayed',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'preferencesRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
