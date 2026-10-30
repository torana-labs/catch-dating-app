// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_success_conversation_graphs.schema.json.

const schemaEventSuccessConversationGraphDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_success_conversation_graphs.schema.json',
  'title': 'EventSuccessConversationGraphDocument',
  'description': 'Attendee-private end-of-event conversation edges stored at eventSuccessConversationGraphs/{eventId_uid}. Hosts consume aggregate scorecard counts only.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventSuccessConversationGraphs',
  'x-firestore-path': 'eventSuccessConversationGraphs/{graphId}',
  'x-document-id-field': 'id',
  'x-owner': 'subject attendee read; conversation graph callable write',
  'required': <Object?>[
    'eventId',
    'clubId',
    'organizerId',
    'uid',
    'status',
    'selectedUids',
    'assignedSelectedCount',
    'assignedCandidateCount',
    'consentMode',
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
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'submitted',
        'skipped',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'selectedUids': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'assignedSelectedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'assignedCandidateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'consentMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'optIn',
        'optOut',
      ],
      'description': 'Snapshot of the event plan mode shown for this response.',
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
