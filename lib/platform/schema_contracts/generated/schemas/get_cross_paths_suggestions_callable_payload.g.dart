// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_cross_paths_suggestions_payload.schema.json.

const schemaGetCrossPathsSuggestionsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_cross_paths_suggestions_payload.schema.json',
  'title': 'GetCrossPathsSuggestionsCallablePayload',
  'description': 'Bounded Explore context accepted by getCrossPathsSuggestions. Event ids must come from the caller\'s current Explore result set; the server revalidates every event.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventIds',
    'sessionId',
  ],
  'properties': <String, Object?>{
    'eventIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 12,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9._~-]+\$',
    },
  },
};
