// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/place_details_response.schema.json.

const schemaPlaceDetailsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/place_details_response.schema.json',
  'title': 'PlaceDetailsCallableResponse',
  'description': 'Callable response returned by placeDetails.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'place',
  ],
  'properties': <String, Object?>{
    'place': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'placeId',
        'displayName',
        'formattedAddress',
        'latitude',
        'longitude',
      ],
      'properties': <String, Object?>{
        'placeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 256,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'maxLength': 240,
        },
        'formattedAddress': <String, Object?>{
          'type': 'string',
          'maxLength': 1000,
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
    },
  },
};
