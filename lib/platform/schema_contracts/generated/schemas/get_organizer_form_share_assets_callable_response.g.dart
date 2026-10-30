// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_form_share_assets_response.schema.json.

const schemaGetOrganizerFormShareAssetsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_form_share_assets_response.schema.json',
  'title': 'GetOrganizerFormShareAssetsCallableResponse',
  'description': 'Canonical URL and safe responsive embed snippet.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'canonicalUrl',
    'embedUrl',
    'embedSnippet',
  ],
  'properties': <String, Object?>{
    'canonicalUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2000,
    },
    'embedUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2000,
    },
    'embedSnippet': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4000,
    },
  },
};
