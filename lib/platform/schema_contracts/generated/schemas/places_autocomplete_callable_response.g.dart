// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/places_autocomplete_response.schema.json.

const schemaPlacesAutocompleteCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/places_autocomplete_response.schema.json',
  'title': 'PlacesAutocompleteCallableResponse',
  'description': 'Callable response returned by placesAutocomplete.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'predictions',
  ],
  'properties': <String, Object?>{
    'predictions': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'placeId',
          'description',
          'mainText',
          'secondaryText',
        ],
        'properties': <String, Object?>{
          'placeId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 256,
          },
          'description': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
          'mainText': <String, Object?>{
            'type': 'string',
            'maxLength': 240,
          },
          'secondaryText': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
        },
      },
    },
  },
};
