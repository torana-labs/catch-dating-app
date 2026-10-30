// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_post_delivery_recipients.schema.json.

const schemaOrganizerPostDeliveryRecipientDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_post_delivery_recipients.schema.json',
  'title': 'OrganizerPostDeliveryRecipientDocument',
  'description': 'Server-only post-scoped, de-identified per-recipient retry evidence for an organizer follower update.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerPostDeliveryRecipients',
  'x-firestore-path': 'organizerPostDeliveryRecipients/{receiptId}',
  'x-document-id-field': 'id',
  'x-owner': 'createOrganizerPost callable and dispatchPendingOrganizerFollowerUpdates scheduler',
  'required': <Object?>[
    'organizerId',
    'postId',
    'activityStatus',
    'pushStatus',
    'activityNotificationId',
    'excluded',
    'errorCode',
    'expiresAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'postId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'activityStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'created',
        'existing',
        'failed',
      ],
      'x-catch-ownership': 'server-only',
    },
    'pushStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'ineligible',
        'accepted',
        'failed',
        'unknown',
      ],
      'x-catch-ownership': 'server-only',
    },
    'activityNotificationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'excluded': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'errorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 120,
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
      'x-firestore-ttl': true,
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
  },
};
