// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_organizer_details_payload.schema.json.

const schemaAdminListOrganizerDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_organizer_details_payload.schema.json',
  'title': 'AdminListOrganizerDetailsCallablePayload',
  'description': 'Callable payload accepted by adminListOrganizerDetails. This lists canonical organizer profile rows from organizers/{organizerId} for the admin publishing workspace.',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'query': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 160,
    },
    'citySlug': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'citySlugs': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          },
          'minItems': 1,
          'maxItems': 10,
          'uniqueItems': true,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'publishStatus': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'draft',
        'qa',
        'published',
        'suppressed',
        'removed',
        null,
      ],
    },
    'appVisibility': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'discoverable',
        'hidden',
        null,
      ],
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
  },
};
