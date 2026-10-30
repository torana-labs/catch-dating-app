// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/places_autocomplete_payload.schema.json.

const schemaPlacesAutocompleteCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/places_autocomplete_payload.schema.json',
  'title': 'PlacesAutocompleteCallablePayload',
  'description': 'Callable payload accepted by placesAutocomplete.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'input',
  ],
  'properties': <String, Object?>{
    'input': <String, Object?>{
      'type': 'string',
      'minLength': 2,
      'maxLength': 120,
    },
    'sessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
    'countryIsoCode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'IN',
        'NP',
        'AU',
        'US',
        'in',
        'np',
        'au',
        'us',
      ],
    },
    'latitude': <String, Object?>{
      'type': 'number',
      'minimum': -90,
      'maximum': 90,
    },
    'longitude': <String, Object?>{
      'type': 'number',
      'minimum': -180,
      'maximum': 180,
    },
  },
};
