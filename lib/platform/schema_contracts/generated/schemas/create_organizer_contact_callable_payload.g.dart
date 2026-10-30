// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_organizer_contact_payload.schema.json.

const schemaCreateOrganizerContactCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_organizer_contact_payload.schema.json',
  'title': 'CreateOrganizerContactCallablePayload',
  'description': 'Manager-only creation of an organizer CRM contact with a required name, at least one unverified phone or email endpoint, and an optional initial private note. It does not create an attendee, Consumer account, or messaging permission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'displayName',
  ],
  'anyOf': <Object?>[
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
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'phoneE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'email': <String, Object?>{
      'type': 'string',
      'format': 'email',
      'maxLength': 320,
    },
    'initialNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
  },
};
