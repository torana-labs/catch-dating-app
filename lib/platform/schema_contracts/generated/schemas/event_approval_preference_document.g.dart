// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_approval_notification_preferences.schema.json.

const schemaEventApprovalPreferenceDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_approval_notification_preferences.schema.json',
  'title': 'EventApprovalPreferenceDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'uid',
    'revision',
    'choices',
    'phoneE164',
    'email',
    'termsVersion',
    'receiptId',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'uid': <String, Object?>{
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
    'phoneE164': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{6,14}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'email': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'email',
          'maxLength': 254,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'termsVersion': <String, Object?>{
      'const': 'event-approval-v1',
      'type': 'string',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'eventApprovalNotificationPreferences',
  'x-firestore-path': 'eventApprovalNotificationPreferences/{id}',
  'x-owner': 'trusted event approval notification services',
};
