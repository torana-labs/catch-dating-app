// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/control_event_rehearsal_spatial_payload.schema.json.

const schemaControlEventRehearsalSpatialCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/control_event_rehearsal_spatial_payload.schema.json',
  'title': 'ControlEventRehearsalSpatialCallablePayload',
  'description': 'Previews or persists one synthetic actor placement inside an isolated dress rehearsal.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'expectedRevision',
    'clientActionId',
    'actorId',
    'action',
    'destinationUnitId',
    'scope',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'clientActionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,120}\$',
    },
    'actorId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'reassign',
        'confirmPosition',
        'releasePinned',
      ],
    },
    'destinationUnitId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^table-[1-9][0-9]*\$',
          'maxLength': 40,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'scope': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'thisRound',
        'pinned',
        null,
      ],
    },
  },
};
