// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_broadcasts.schema.json.

const schemaEventBroadcastDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_broadcasts.schema.json',
  'title': 'EventBroadcastDocument',
  'description': 'Server-owned delivery receipt for an organizer event broadcast stored at eventBroadcasts/{broadcastId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventBroadcasts',
  'x-firestore-path': 'eventBroadcasts/{broadcastId}',
  'x-document-id-field': 'id',
  'x-owner': 'sendEventBroadcast callable',
  'required': <Object?>[
    'eventId',
    'clubId',
    'actorUid',
    'audience',
    'title',
    'body',
    'targetUids',
    'status',
    'recipientCount',
    'excludedCount',
    'activityAvailableCount',
    'pushAttemptedCount',
    'pushAcceptedCount',
    'pushFailedCount',
    'pushUnknownCount',
    'pushErrorCodes',
    'deliveries',
    'leaseOwner',
    'leaseExpiresAt',
    'expiresAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'audience': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'booked',
        'prospective',
        'everyone',
      ],
      'x-catch-ownership': 'server-only',
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'x-catch-ownership': 'server-only',
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
      'x-catch-ownership': 'server-only',
    },
    'targetUids': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'x-catch-ownership': 'server-only',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'processing',
        'completed',
        'partial',
        'failed',
      ],
      'x-catch-ownership': 'server-only',
    },
    'recipientCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'excludedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'activityAvailableCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'pushAttemptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'pushAcceptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'pushFailedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'pushUnknownCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'x-catch-ownership': 'server-only',
    },
    'pushErrorCodes': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
      },
      'x-catch-ownership': 'server-only',
    },
    'deliveries': <String, Object?>{
      'type': 'object',
      'maxProperties': 500,
      'additionalProperties': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'activityStatus',
          'pushStatus',
          'activityNotificationId',
        ],
        'properties': <String, Object?>{
          'activityStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'created',
              'existing',
              'failed',
            ],
          },
          'pushStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ineligible',
              'accepted',
              'failed',
              'unknown',
            ],
          },
          'activityNotificationId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'excluded': <String, Object?>{
            'type': 'boolean',
          },
          'errorCode': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'leaseOwner': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'leaseExpiresAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'expiresAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'completedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
  },
};
