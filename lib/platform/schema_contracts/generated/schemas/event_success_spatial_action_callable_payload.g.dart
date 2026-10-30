// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/event_success_spatial_action_payload.schema.json.

const schemaEventSuccessSpatialActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/event_success_spatial_action_payload.schema.json',
  'title': 'EventSuccessSpatialActionCallablePayload',
  'description': 'Revision-fenced Host spatial-control action.',
  'x-callable-aliases': <Object?>[
    'controlEventSuccessSpatial',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
    'action',
    'moduleId',
    'uid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'previewReassignment',
        'reassign',
        'confirmPosition',
        'releasePinned',
      ],
    },
    'moduleId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'micro_pods',
        'guided_rotations',
      ],
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationUnitId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
    },
    'scope': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'thisRound',
        'pinned',
      ],
    },
  },
};
