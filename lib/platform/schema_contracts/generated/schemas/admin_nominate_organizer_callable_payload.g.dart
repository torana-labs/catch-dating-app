// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_nominate_organizer_payload.schema.json.

const schemaAdminNominateOrganizerCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_nominate_organizer_payload.schema.json',
  'title': 'AdminNominateOrganizerCallablePayload',
  'description': 'A Catch sales associate nominates an organizer. Supply Intake builds the listing from the name and links; nothing is published until staff review it.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'name',
    'market',
    'urls',
    'notes',
    'categories',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\$',
    },
    'name': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 160,
    },
    'market': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'urls': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 2000,
        'pattern': '^https?://',
      },
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 2000,
    },
    'categories': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[a-z][a-z0-9_]{0,59}\$',
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'name': <String, Object?>{
            'type': 'null',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'urls': <String, Object?>{
            'minItems': 1,
          },
        },
      },
    },
  ],
  'x-callable-aliases': <Object?>[
    'adminNominateOrganizer',
  ],
};
