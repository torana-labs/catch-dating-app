// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_application_source_mappings.schema.json.

const schemaOrganizerApplicationSourceMappingDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_application_source_mappings.schema.json',
  'title': 'OrganizerApplicationSourceMappingDocument',
  'description': 'Reusable provider-neutral mapping from external tabular columns to one Catch form version.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerApplicationSourceMappings',
  'x-firestore-path': 'organizerApplicationSourceMappings/{mappingId}',
  'x-document-id-field': 'mappingId',
  'x-owner': 'organizer application import callables',
  'required': <Object?>[
    'organizerId',
    'formId',
    'formVersionId',
    'name',
    'sourceKind',
    'providerId',
    'externalFormId',
    'headerFingerprint',
    'columns',
    'createdByUid',
    'revision',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'sourceKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
        'connector',
      ],
    },
    'providerId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'externalFormId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'headerFingerprint': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'columns': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 250,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'sourceHeader',
          'sourceHeaderNormalized',
          'action',
          'questionId',
          'transform',
        ],
        'properties': <String, Object?>{
          'sourceHeader': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'sourceHeaderNormalized': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'action': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'map',
              'ignore',
            ],
          },
          'questionId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'transform': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'identity',
              'trim',
              'e164',
              'isoDate',
              'number',
              'boolean',
              'splitOptions',
              'assetUrl',
            ],
          },
        },
      },
    },
    'createdByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
