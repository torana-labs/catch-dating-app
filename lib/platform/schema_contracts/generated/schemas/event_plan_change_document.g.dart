// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_plan_changes.schema.json.

const schemaEventPlanChangeDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_plan_changes.schema.json',
  'title': 'EventPlanChangeDocument',
  'description': 'Immutable server-authored event plan change stored at eventPlanChanges/{sourceId}. Each revision captures the attendee-relevant event facts after one committed host edit.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventPlanChanges',
  'x-firestore-path': 'eventPlanChanges/{sourceId}',
  'x-document-id-field': 'sourceId',
  'x-owner': 'updateEvent callable and trusted Event Assistance workers',
  'required': <Object?>[
    'schemaVersion',
    'sourceId',
    'eventId',
    'organizerId',
    'revision',
    'changedFields',
    'eventTitle',
    'startTime',
    'endTime',
    'meetingPoint',
    'itineraryStopCount',
    'occurredAt',
    'validUntil',
    'createdBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 2147483647,
    },
    'changedFields': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 5,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'name',
          'schedule',
          'meetingLocation',
          'itinerary',
          'format',
        ],
      },
    },
    'eventTitle': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'startTime': <String, Object?>{
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
    'endTime': <String, Object?>{
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
    'meetingPoint': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'itineraryStopCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 40,
    },
    'occurredAt': <String, Object?>{
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
    'validUntil': <String, Object?>{
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
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
