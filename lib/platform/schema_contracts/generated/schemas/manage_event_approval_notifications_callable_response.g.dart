// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_event_approval_notifications_response.schema.json.

const schemaManageEventApprovalNotificationsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_event_approval_notifications_response.schema.json',
  'title': 'ManageEventApprovalNotificationsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'revision',
    'choices',
    'phoneVerified',
    'emailVerified',
    'available',
    'terms',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'choices': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phoneUpdates',
        'emailUpdates',
      ],
      'properties': <String, Object?>{
        'phoneUpdates': <String, Object?>{
          'type': 'boolean',
        },
        'emailUpdates': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'phoneVerified': <String, Object?>{
      'type': 'boolean',
    },
    'emailVerified': <String, Object?>{
      'type': 'boolean',
    },
    'available': <String, Object?>{
      'type': 'boolean',
    },
    'terms': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'phone',
        'email',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'type': 'string',
          'const': 'event-approval-v1',
        },
        'phone': <String, Object?>{
          'type': 'string',
        },
        'email': <String, Object?>{
          'type': 'string',
        },
      },
    },
  },
};
