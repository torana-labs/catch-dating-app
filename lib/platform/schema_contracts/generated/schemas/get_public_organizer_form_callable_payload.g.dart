// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_public_organizer_form_payload.schema.json.

const schemaGetPublicOrganizerFormCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_public_organizer_form_payload.schema.json',
  'title': 'GetPublicOrganizerFormCallablePayload',
  'description': 'Resolves one bounded public form projection.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicFormId',
    'sourceToken',
  ],
  'properties': <String, Object?>{
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'sourceToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{20,160}\$',
    },
  },
};
