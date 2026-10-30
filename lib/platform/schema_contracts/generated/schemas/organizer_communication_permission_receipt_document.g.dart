// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_communication_permission_receipts.schema.json.

const schemaOrganizerCommunicationPermissionReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_communication_permission_receipts.schema.json',
  'title': 'OrganizerCommunicationPermissionReceiptDocument',
  'description': 'Immutable participant-controlled grant or withdrawal evidence for one organizer and channel. Current preference projections reference these receipts but never replace their history.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerCommunicationPermissionReceipts',
  'x-firestore-path': 'organizerCommunicationPermissionReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'participant registration, self-service preference, unsubscribe, and inbound STOP handlers',
  'required': <Object?>[
    'organizerId',
    'uid',
    'channel',
    'decision',
    'evidenceStatus',
    'termsVersion',
    'consentCopyHash',
    'source',
    'sourceEventId',
    'sourceFormId',
    'sourceResponseId',
    'sourceProviderEventId',
    'actorClass',
    'actorUid',
    'identityStrength',
    'grantedAt',
    'revokedAt',
    'supersedesReceiptId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'whatsapp',
        'sms',
      ],
    },
    'purpose': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventOperations',
        'marketing',
      ],
    },
    'endpointE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{6,14}\$',
    },
    'sourceVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceDecidedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'optedIn',
        'optedOut',
      ],
    },
    'evidenceStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'complete',
        'incomplete',
      ],
    },
    'termsVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'consentCopyHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'publicEventRegistration',
        'hostFormResponse',
        'participantSettings',
        'unsubscribeLink',
        'inboundStop',
        'providerWebhook',
        'legacyIncomplete',
      ],
    },
    'sourceEventId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceFormId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceResponseId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceProviderEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'actorClass': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'participant',
        'provider',
        'system',
      ],
    },
    'actorUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'identityStrength': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'emailVerified',
        'phoneVerified',
        'catchAccount',
      ],
    },
    'grantedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'revokedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'supersedesReceiptId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'decision': <String, Object?>{
            'const': 'optedIn',
          },
          'evidenceStatus': <String, Object?>{
            'const': 'complete',
          },
        },
        'required': <Object?>[
          'decision',
          'evidenceStatus',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'termsVersion': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'consentCopyHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'grantedAt': <String, Object?>{
            'type': 'object',
            'description': 'Serialized Firestore Timestamp fixture shape.',
            'x-firestore-type': 'timestamp',
            'additionalProperties': false,
            'required': <Object?>[
              '_seconds',
              '_nanoseconds',
            ],
            'properties': <String, Object?>{
              '_seconds': <String, Object?>{
                'type': 'integer',
              },
              '_nanoseconds': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 999999999,
              },
            },
          },
          'revokedAt': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'decision': <String, Object?>{
            'const': 'optedOut',
          },
          'evidenceStatus': <String, Object?>{
            'const': 'complete',
          },
        },
        'required': <Object?>[
          'decision',
          'evidenceStatus',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'grantedAt': <String, Object?>{
            'type': 'null',
          },
          'revokedAt': <String, Object?>{
            'type': 'object',
            'description': 'Serialized Firestore Timestamp fixture shape.',
            'x-firestore-type': 'timestamp',
            'additionalProperties': false,
            'required': <Object?>[
              '_seconds',
              '_nanoseconds',
            ],
            'properties': <String, Object?>{
              '_seconds': <String, Object?>{
                'type': 'integer',
              },
              '_nanoseconds': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 999999999,
              },
            },
          },
        },
      },
    },
  ],
};
