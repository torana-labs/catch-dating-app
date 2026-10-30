// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_approval_notification_dispatches.schema.json.

const schemaEventApprovalNotificationDispatchDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_approval_notification_dispatches.schema.json',
  'title': 'EventApprovalNotificationDispatchDocument',
  'description': 'Private immutable approval WhatsApp dispatch correlation, created atomically with its shared outbox claim.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventApprovalNotificationDispatches',
  'x-firestore-path': 'eventApprovalNotificationDispatches/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'trusted approval notification delivery worker',
  'required': <Object?>[
    'schemaVersion',
    'attemptId',
    'messageId',
    'context',
    'senderId',
    'bindingRevision',
    'providerAccountId',
    'providerPhoneNumberId',
    'senderHash',
    'recipientEndpointId',
    'endpointHash',
    'templateDocumentId',
    'templateHash',
    'payloadHash',
    'createdAt',
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
      'pattern': '^[A-Za-z0-9][a-zA-Z0-9._:-]*\$',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'applicationId',
        'organizerId',
        'eventId',
        'uid',
        'sourceResponseId',
        'approvedAtMillis',
        'approvalRevision',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'applicationId': <String, Object?>{
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
        'eventId': <String, Object?>{
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
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'approvedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'approvalRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
      'description': 'organizerSenderConnections document id that owned the send.',
    },
    'bindingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[0-9]{1,32}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[0-9]{1,32}\$',
    },
    'senderHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Content hash of the sender connection snapshot authorized at claim.',
    },
    'recipientEndpointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Hash of the E.164 destination; the raw number never appears here.',
    },
    'templateDocumentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
    },
    'templateHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Content hash of the rendered template + variables; the status callback must carry the matching correlation.',
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
