// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_sms_dispatches.schema.json.

const schemaEventAssistanceSmsDispatchDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'attemptId',
    'messageId',
    'senderId',
    'bindingRevision',
    'configHash',
    'permissionId',
    'permissionRevision',
    'recipientEndpointId',
    'payloadHash',
    'templateId',
    'templateRevision',
    'quoteRevision',
    'grantId',
    'encoding',
    'segments',
    'maxCostMicros',
    'budgetIds',
    'createdAt',
    'reportTokenHash',
    'senderMask',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'bindingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'configHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'permissionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'permissionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'recipientEndpointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'templateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'templateRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'quoteRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'grantId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{32}\$',
    },
    'encoding': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'gsm7',
        'unicode',
      ],
    },
    'segments': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 6,
    },
    'maxCostMicros': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'budgetIds': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'reportTokenHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'senderMask': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z]{6}\$',
    },
  },
  'title': 'EventAssistanceSmsDispatchDocument',
  'x-firestore-collection': 'eventAssistanceSmsDispatches',
  'x-firestore-path': 'eventAssistanceSmsDispatches/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'trusted event-assistance SMS worker',
};
