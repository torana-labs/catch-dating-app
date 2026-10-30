// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_saved_audiences_payload.schema.json.

const schemaListOrganizerSavedAudiencesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_saved_audiences_payload.schema.json',
  'title': 'ListOrganizerSavedAudiencesCallablePayload',
  'description': 'Lists one organizer\'s reusable CRM audiences.',
  'x-callable-aliases': <Object?>[
    'listOrganizerSavedAudiences',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'archived',
      ],
      'default': 'active',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'includeFilterOptions': <String, Object?>{
      'type': 'boolean',
    },
  },
};
