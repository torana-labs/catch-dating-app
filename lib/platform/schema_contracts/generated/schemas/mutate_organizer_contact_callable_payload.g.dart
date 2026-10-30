// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/mutate_organizer_contact_payload.schema.json.

const schemaMutateOrganizerContactCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/mutate_organizer_contact_payload.schema.json',
  'title': 'MutateOrganizerContactCallablePayload',
  'description': 'Manager-only organizer-scoped contact correction, manual identity detail update, suppression, or hiding request.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'expectedRevision',
  ],
  'anyOf': <Object?>[
    <String, Object?>{
      'required': <Object?>[
        'displayNameOverride',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'whatsappAdminSuppressed',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'hidden',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'manualTags',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'phoneE164',
      ],
    },
    <String, Object?>{
      'required': <Object?>[
        'email',
      ],
    },
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
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'displayNameOverride': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 120,
    },
    'phoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'email': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'email',
      'maxLength': 320,
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
        'type': 'string',
        'minLength': 1,
        'maxLength': 40,
      },
    },
  },
};
