// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_consent_receipts.schema.json.

const schemaEventRcsConsentReceiptDocumentSchema = <String, Object?>{
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
        'sourceGeneration',
        'actorUid',
        'senderId',
        'senderHash',
        'routeId',
        'recipientEndpointId',
        'source',
        'permissionHash',
        'appliedRevision',
        'createdAt',
        'decision',
        'copyVersion',
        'copyHash',
        'reviewHash',
        'reviewedStopHash',
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
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'actorUid': <String, Object?>{
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
        'senderHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'catchEventRcs',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'source': <String, Object?>{
          'type': 'string',
          'const': 'verifiedParticipant',
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'decision': <String, Object?>{
          'type': 'string',
          'const': 'grant',
        },
        'copyVersion': <String, Object?>{
          'type': 'string',
          'const': 'catch-event-service-rcs-v1',
        },
        'copyHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'reviewedStopHash': <String, Object?>{
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
        'sourceGeneration',
        'actorUid',
        'senderId',
        'senderHash',
        'routeId',
        'recipientEndpointId',
        'source',
        'permissionHash',
        'appliedRevision',
        'createdAt',
        'decision',
        'copyVersion',
        'copyHash',
        'reviewHash',
        'reviewedStopHash',
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
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'actorUid': <String, Object?>{
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
        'senderHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'catchEventRcs',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'source': <String, Object?>{
          'type': 'string',
          'const': 'verifiedParticipant',
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'reviewHash': <String, Object?>{
          'type': 'null',
        },
        'reviewedStopHash': <String, Object?>{
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
        'sourceGeneration',
        'actorUid',
        'senderId',
        'senderHash',
        'routeId',
        'recipientEndpointId',
        'source',
        'permissionHash',
        'appliedRevision',
        'createdAt',
        'decision',
        'copyVersion',
        'copyHash',
        'reviewHash',
        'reviewedStopHash',
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
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'actorUid': <String, Object?>{
          'type': 'null',
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'senderHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'catchEventRcs',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'source': <String, Object?>{
          'type': 'string',
          'const': 'messageLink',
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'reviewHash': <String, Object?>{
          'type': 'null',
        },
        'reviewedStopHash': <String, Object?>{
          'type': 'null',
        },
        'linkId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{32}\$',
        },
      },
    },
  ],
  'title': 'EventRcsConsentReceiptDocument',
  'x-firestore-collection': 'eventAssistanceRcsConsentReceipts',
  'x-firestore-path': 'eventAssistanceRcsConsentReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'verified participant event-service preferences',
};
