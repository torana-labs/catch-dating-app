// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_event_approval_notifications_payload.schema.json.

const schemaManageEventApprovalNotificationsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_event_approval_notifications_payload.schema.json',
  'title': 'ManageEventApprovalNotificationsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'action',
    'expectedUid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'get',
        'save',
      ],
    },
    'expectedRevision': <String, Object?>{
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
    'termsVersion': <String, Object?>{
      'type': 'string',
      'const': 'event-approval-v1',
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
  },
  'x-callable-aliases': <Object?>[
    'manageEventApprovalNotifications',
  ],
};
