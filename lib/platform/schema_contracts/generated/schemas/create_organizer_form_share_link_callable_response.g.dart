// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_organizer_form_share_link_response.schema.json.

const schemaCreateOrganizerFormShareLinkCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_organizer_form_share_link_response.schema.json',
  'title': 'CreateOrganizerFormShareLinkCallableResponse',
  'description': 'Source-attributed public form URL.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'linkId',
    'label',
    'source',
    'url',
    'sourceToken',
  ],
  'properties': <String, Object?>{
    'linkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'source': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
    },
    'url': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2000,
    },
    'sourceToken': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,160}\$',
    },
  },
};
