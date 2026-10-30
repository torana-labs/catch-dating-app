// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_event_details_payload.schema.json.

const schemaAdminListEventDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_event_details_payload.schema.json',
  'title': 'AdminListEventDetailsCallablePayload',
  'description': 'Callable payload accepted by adminListEventDetails. This lists canonical events/{eventId} rows for the admin event publishing workspace.',
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
    'clubId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
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
    'activityKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'socialRun',
        'running',
        'walking',
        'pickleball',
        'padel',
        'tennis',
        'badminton',
        'cycling',
        'spinClass',
        'yoga',
        'strengthTraining',
        'pubQuiz',
        'barCrawl',
        'dinner',
        'singlesMixer',
        'openActivity',
        null,
      ],
    },
    'status': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'active',
        'cancelled',
        null,
      ],
    },
    'timeWindow': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'upcoming',
        'past',
        'all',
        null,
      ],
      'description': 'Optional server-side startTime window used by admin event lists. Upcoming and past are evaluated against callable server time.',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
  },
};
