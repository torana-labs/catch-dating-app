// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/mutate_organizer_contact_response.schema.json.

const schemaMutateOrganizerContactCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/mutate_organizer_contact_response.schema.json',
  'title': 'MutateOrganizerContactCallableResponse',
  'description': 'Safe state returned after an organizer-scoped contact mutation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'displayName',
    'displayNameOverride',
    'whatsappAdminSuppressed',
    'hidden',
    'revision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'displayNameOverride': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 120,
    },
    'whatsappAdminSuppressed': <String, Object?>{
      'type': 'boolean',
    },
    'hidden': <String, Object?>{
      'type': 'boolean',
    },
    'manualTags': <String, Object?>{
      'type': 'array',
      'maxItems': 5,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'tagId',
          'label',
        ],
        'properties': <String, Object?>{
          'tagId': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{32}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
        },
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
