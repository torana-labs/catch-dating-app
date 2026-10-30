// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/explore_search_response.schema.json.

const schemaExploreSearchCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/explore_search_response.schema.json',
  'title': 'ExploreSearchCallableResponse',
  'description': 'Callable response returned by exploreSearch.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerIds',
    'clubIds',
    'eventIds',
  ],
  'properties': <String, Object?>{
    'organizerIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 256,
      },
    },
    'clubIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 256,
      },
    },
    'eventIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 256,
      },
    },
  },
};
