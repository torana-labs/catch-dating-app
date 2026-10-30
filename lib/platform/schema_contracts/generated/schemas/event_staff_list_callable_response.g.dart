// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_staff_list_response.schema.json.

const schemaEventStaffListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_staff_list_response.schema.json',
  'title': 'EventStaffListCallableResponse',
  'description': 'Manager-only event staff list with masked phone data.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'members',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'members': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'phoneLastFour',
          'status',
          'expiresAtMillis',
          'revision',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'phoneLastFour': <String, Object?>{
            'type': 'string',
            'pattern': '^[0-9]{4}\$',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'active',
              'revoked',
              'expired',
            ],
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'member': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'displayName',
        'phoneLastFour',
        'status',
        'expiresAtMillis',
        'revision',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'phoneLastFour': <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{4}\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'revoked',
            'expired',
          ],
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
