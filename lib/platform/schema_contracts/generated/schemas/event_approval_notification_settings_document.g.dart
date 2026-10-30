// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_approval_notification_settings.schema.json.

const schemaEventApprovalNotificationSettingsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_approval_notification_settings.schema.json',
  'title': 'EventApprovalNotificationSettingsDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'enabled',
    'revision',
    'whatsapp',
    'sms',
    'email',
    'dailyPhoneLimit',
    'monthlyPhoneLimit',
    'dailyCostLimitMicros',
    'monthlyCostLimitMicros',
  ],
  'properties': <String, Object?>{
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'whatsapp': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'connectionId',
            'templateId',
            'maxCostMicros',
          ],
          'properties': <String, Object?>{
            'connectionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'templateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'maxCostMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sms': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'accountId',
            'credentialVersion',
            'senderId',
            'mask',
            'principalEntityId',
            'dltTemplateId',
            'approvedText',
            'maxCostMicros',
          ],
          'properties': <String, Object?>{
            'accountId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'credentialVersion': <String, Object?>{
              'type': 'string',
              'maxLength': 300,
              'pattern': '^projects/[A-Za-z0-9_-]+/secrets/[A-Za-z0-9_-]+/versions/[1-9][0-9]*\$',
            },
            'senderId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'mask': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'principalEntityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'dltTemplateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'approvedText': <String, Object?>{
              'const': 'Your event application is approved. View your next steps: {eventUrl}',
              'type': 'string',
            },
            'maxCostMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'email': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'provider',
            'accountId',
            'credentialVersion',
            'from',
          ],
          'properties': <String, Object?>{
            'provider': <String, Object?>{
              'type': 'string',
              'const': 'resend',
            },
            'accountId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'credentialVersion': <String, Object?>{
              'type': 'string',
              'maxLength': 300,
              'pattern': '^projects/[A-Za-z0-9_-]+/secrets/[A-Za-z0-9_-]+/versions/[1-9][0-9]*\$',
            },
            'from': <String, Object?>{
              'type': 'string',
              'format': 'email',
              'maxLength': 254,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'dailyPhoneLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'monthlyPhoneLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'dailyCostLimitMicros': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'monthlyCostLimitMicros': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'eventApprovalNotificationSettings',
  'x-firestore-path': 'eventApprovalNotificationSettings/{id}',
  'x-owner': 'trusted event approval notification services',
};
