// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/explore_search_payload.schema.json.

const schemaExploreSearchCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/explore_search_payload.schema.json',
  'title': 'ExploreSearchCallablePayload',
  'description': 'Callable payload accepted by exploreSearch.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'query',
  ],
  'properties': <String, Object?>{
    'query': <String, Object?>{
      'type': 'string',
      'minLength': 2,
      'maxLength': 120,
    },
    'cityName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      'description': 'Canonical launch market id. The field name is retained for callable compatibility.',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
  },
};
