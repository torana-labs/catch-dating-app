// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/place_details_payload.schema.json.

const schemaPlaceDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/place_details_payload.schema.json',
  'title': 'PlaceDetailsCallablePayload',
  'description': 'Callable payload accepted by placeDetails.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'placeId',
  ],
  'properties': <String, Object?>{
    'placeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 256,
    },
    'sessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
  },
};
