// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_sms_consent_receipts.schema.json.

const schemaEventAssistanceSmsConsentReceiptDocumentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'receiptId',
        'requestHash',
        'context',
        'attendeeId',
        'attendeeGeneration',
        'senderId',
        'routeId',
        'actorUid',
        'recipientEndpointId',
        'decision',
        'copyVersion',
        'copyHash',
        'appliedRevision',
        'createdAt',
        'permissionHash',
        'source',
        'linkId',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'catchEventSms',
        },
        'actorUid': <String, Object?>{
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
        'decision': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'grant',
            'revoke',
          ],
        },
        'copyVersion': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'string',
              'const': 'catch-event-service-sms-v1',
            },
          ],
        },
        'copyHash': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          ],
        },
        'appliedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'source': <String, Object?>{
          'type': 'string',
          'const': 'verifiedParticipant',
        },
        'linkId': <String, Object?>{
          'type': 'null',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'receiptId',
        'requestHash',
        'context',
        'attendeeId',
        'attendeeGeneration',
        'senderId',
        'routeId',
        'actorUid',
        'recipientEndpointId',
        'decision',
        'copyVersion',
        'copyHash',
        'appliedRevision',
        'createdAt',
        'permissionHash',
        'source',
        'linkId',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'catchEventSms',
        },
        'actorUid': <String, Object?>{
          'type': 'null',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'decision': <String, Object?>{
          'type': 'string',
          'const': 'revoke',
        },
        'copyVersion': <String, Object?>{
          'type': 'null',
        },
        'copyHash': <String, Object?>{
          'type': 'null',
        },
        'appliedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'source': <String, Object?>{
          'type': 'string',
          'const': 'messageLink',
        },
        'linkId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{32}\$',
        },
      },
    },
  ],
  'title': 'EventAssistanceSmsConsentReceiptDocument',
  'x-firestore-collection': 'eventAssistanceSmsConsentReceipts',
  'x-firestore-path': 'eventAssistanceSmsConsentReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'verified participant event-service preferences',
};
