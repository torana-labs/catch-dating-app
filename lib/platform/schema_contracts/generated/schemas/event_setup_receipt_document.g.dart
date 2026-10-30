// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_setup_receipts.schema.json.

const schemaEventSetupReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_setup_receipts.schema.json',
  'title': 'EventSetupReceiptDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'operation',
    'actorUid',
    'organizerId',
    'requestHash',
    'eventId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'operation': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'create',
        'update',
        'preferences',
        'details',
        'publish',
        'unpublish',
        'media',
      ],
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'appliedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
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
    'outcome': <String, Object?>{
      'type': 'string',
      'const': 'discarded',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
    },
    'mediaPayloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 999999999,
    },
  },
  'x-firestore-collection': 'eventSetupReceipts',
  'x-firestore-path': 'eventSetupReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'private event setup operations',
  'oneOf': <Object?>[
    <String, Object?>{
      'required': <Object?>[
        'appliedRevision',
      ],
      'not': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'required': <Object?>[
              'outcome',
            ],
          },
          <String, Object?>{
            'required': <Object?>[
              'expectedSetupRevision',
            ],
          },
          <String, Object?>{
            'required': <Object?>[
              'mediaPayloadHash',
            ],
          },
          <String, Object?>{
            'properties': <String, Object?>{
              'operation': <String, Object?>{
                'const': 'media',
              },
            },
          },
        ],
      },
    },
    <String, Object?>{
      'required': <Object?>[
        'outcome',
        'expectedSetupRevision',
      ],
      'properties': <String, Object?>{
        'operation': <String, Object?>{
          'const': 'details',
        },
      },
      'not': <String, Object?>{
        'required': <Object?>[
          'appliedRevision',
        ],
      },
    },
    <String, Object?>{
      'required': <Object?>[
        'requestId',
        'mediaPayloadHash',
      ],
      'properties': <String, Object?>{
        'operation': <String, Object?>{
          'const': 'media',
        },
      },
      'not': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'required': <Object?>[
              'appliedRevision',
            ],
          },
          <String, Object?>{
            'required': <Object?>[
              'outcome',
            ],
          },
          <String, Object?>{
            'required': <Object?>[
              'expectedSetupRevision',
            ],
          },
        ],
      },
    },
  ],
};
