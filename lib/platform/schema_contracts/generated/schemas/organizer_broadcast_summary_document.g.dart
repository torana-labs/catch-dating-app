// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_broadcast_summaries.schema.json.

const schemaOrganizerBroadcastSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_broadcast_summaries.schema.json',
  'title': 'OrganizerBroadcastSummaryDocument',
  'description': 'Server-owned organizer-scoped index of one completed event announcement, including bounded contact delivery state for CRM history.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerBroadcastSummaries',
  'x-firestore-path': 'organizerBroadcastSummaries/{broadcastId}',
  'x-document-id-field': 'broadcastId',
  'x-owner': 'sendEventBroadcast callable',
  'required': <Object?>[
    'organizerId',
    'broadcastId',
    'eventId',
    'eventName',
    'audience',
    'recipientCount',
    'sentAt',
    'partialFailure',
    'recipientContactIds',
    'recipientDeliveryStates',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'broadcastId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'audience': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'booked',
        'prospective',
        'everyone',
      ],
    },
    'recipientCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'sentAt': <String, Object?>{
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
    'partialFailure': <String, Object?>{
      'type': 'boolean',
    },
    'recipientContactIds': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'recipientDeliveryStates': <String, Object?>{
      'type': 'object',
      'maxProperties': 500,
      'additionalProperties': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'available',
          'failed',
        ],
      },
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
    },
  },
};
