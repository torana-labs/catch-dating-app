// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_checkpoints.schema.json.

const schemaEventAssistanceCheckpointDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'reportId',
    'context',
    'groupId',
    'checkpointId',
    'progressRevision',
    'rosterId',
    'rosterHash',
    'revision',
    'accountedFor',
    'reportedBy',
    'reportedAt',
    'correctionReason',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'reportId': <String, Object?>{
      'type': 'string',
      'pattern': '^checkpoint:[a-f0-9]{64}\$',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'eventId',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
      },
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'checkpointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'progressRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'rosterId': <String, Object?>{
      'type': 'string',
      'pattern': '^departure-roster:[a-f0-9]{64}\$',
    },
    'rosterHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'accountedFor': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
      'uniqueItems': true,
      'maxItems': 1000,
    },
    'reportedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'reportedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'correctionReason': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
          'pattern': '\\S',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventAssistanceCheckpointDocument',
  'x-firestore-collection': 'eventAssistanceCheckpoints',
  'x-firestore-path': 'eventAssistanceCheckpoints/{reportId}',
  'x-document-id-field': 'reportId',
  'x-owner': 'event-assistance checkpoint command',
};
