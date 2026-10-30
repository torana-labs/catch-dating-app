// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_invite_links.schema.json.

const schemaEventInviteLinkDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_invite_links.schema.json',
  'title': 'EventInviteLinkDocument',
  'description': 'Opaque event invitation metadata stored at eventInviteLinks/{inviteLinkId}. The public bearer token is stored separately in a server-only secret document.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventInviteLinks',
  'x-firestore-path': 'eventInviteLinks/{inviteLinkId}',
  'x-document-id-field': 'id',
  'x-owner': 'event invite link callables and event-success scorecard recomputation',
  'required': <Object?>[
    'eventId',
    'clubId',
    'hostUid',
    'label',
    'source',
    'tokenHash',
    'openCount',
    'requestCount',
    'confirmedCount',
    'paidCount',
    'checkedInCount',
    'catcherCount',
    'matchCount',
    'chatStartedCount',
    'disabledAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'hostUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'x-catch-ownership': 'callable-owned',
    },
    'source': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
      'x-catch-ownership': 'callable-owned',
    },
    'tokenHash': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'contractVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
      'maximum': 2,
      'x-catch-ownership': 'callable-owned',
    },
    'linkKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostChannel',
        'directRecipient',
        'attendeeReferrer',
        'promoter',
        'partner',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'ownerContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'ownerUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'intendedRecipientContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'campaignId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'issuanceChannel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostApp',
        'consumerApp',
        'runtimeWeb',
        'campaign',
        'api',
        'formAutomation',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'destinationKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchEvent',
        'eventRuntime',
        'externalBooking',
        'marketingLanding',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'tokenVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
      'x-catch-ownership': 'callable-owned',
    },
    'attributionWindowEndsAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'openCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'likelyHumanOpenCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'shareIntentCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'verifiedRegistrationCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'referredRegistrationCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'referredCheckedInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'requestCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'confirmedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'paidCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'checkedInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'catcherCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'matchCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'chatStartedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'trigger-owned',
    },
    'disabledAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
  },
};
