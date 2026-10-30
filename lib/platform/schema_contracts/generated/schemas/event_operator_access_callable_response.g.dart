// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_operator_access_response.schema.json.

const schemaEventOperatorAccessCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_operator_access_response.schema.json',
  'title': 'EventOperatorAccessCallableResponse',
  'description': 'Sanitized event facts and exact operator permissions. No organizer-wide data is exposed.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'title',
    'startAtMillis',
    'endAtMillis',
    'eventStatus',
    'actorRole',
    'permissions',
    'grantExpiresAtMillis',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'startAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'endAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'eventStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'cancelled',
      ],
    },
    'actorRole': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'manager',
        'operator',
      ],
    },
    'permissions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'viewRoster',
          'setAttendance',
          'reviewRuntimeClaims',
          'publishLiveLocation',
        ],
      },
    },
    'grantExpiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
  },
};
