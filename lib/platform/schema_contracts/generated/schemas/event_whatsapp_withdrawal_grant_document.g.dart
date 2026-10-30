// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_whatsapp_withdrawal_grants.schema.json.

const schemaEventWhatsappWithdrawalGrantDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'linkId',
    'permissionId',
    'context',
    'attendeeId',
    'attendeeGeneration',
    'subjectUid',
    'senderId',
    'recipientEndpointId',
    'guestGrantHash',
    'permissionRevisionAtIssue',
    'issuedAt',
    'expiresAt',
    'providerAccountId',
    'providerPhoneNumberId',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'linkId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{32}\$',
    },
    'permissionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'organizerId',
        'eventId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'attendeeGeneration': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'subjectUid': <String, Object?>{
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
    'recipientEndpointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'guestGrantHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'permissionRevisionAtIssue': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'issuedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
  },
  'title': 'EventWhatsappWithdrawalGrantDocument',
  'x-firestore-collection': 'eventAssistanceWhatsappWithdrawalGrants',
  'x-firestore-path': 'eventAssistanceWhatsappWithdrawalGrants/{linkId}',
  'x-document-id-field': 'linkId',
  'x-owner': 'event-service WhatsApp dispatch and withdrawal',
};
