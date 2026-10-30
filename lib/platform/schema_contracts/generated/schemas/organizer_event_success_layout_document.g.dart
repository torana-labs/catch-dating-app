// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_event_success_layouts.schema.json.

const schemaOrganizerEventSuccessLayoutDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_event_success_layouts.schema.json',
  'title': 'OrganizerEventSuccessLayoutDocument',
  'description': 'Reusable organizer-owned parametric room layout stored at organizerEventSuccessLayouts/{organizerId_layoutId}. Derived coordinates and proximity edges are never persisted.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerEventSuccessLayouts',
  'x-firestore-path': 'organizerEventSuccessLayouts/{layoutDocumentId}',
  'x-document-id-field': 'id',
  'x-owner': 'organizer manager through upsertEventSuccessLayout',
  'required': <Object?>[
    'organizerId',
    'layoutId',
    'label',
    'units',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'layoutId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'units': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'shape',
          'capacity',
          'gridX',
          'gridY',
          'order',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'shape': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'round',
              'rect',
              'row',
              'court',
              'zone',
            ],
          },
          'capacity': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000,
          },
          'gridX': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 199,
          },
          'gridY': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 199,
          },
          'order': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
        },
      },
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
