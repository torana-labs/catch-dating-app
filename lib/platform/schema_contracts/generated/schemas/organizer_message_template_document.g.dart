// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_message_templates.schema.json.

const schemaOrganizerMessageTemplateDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_message_templates.schema.json',
  'title': 'OrganizerMessageTemplateDocument',
  'description': 'Sanitized provider template metadata used for preview and send eligibility.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerMessageTemplates',
  'x-firestore-path': 'organizerMessageTemplates/{templateId}',
  'x-document-id-field': 'templateId',
  'x-owner': 'WhatsApp template synchronization',
  'required': <Object?>[
    'organizerId',
    'connectionId',
    'providerTemplateId',
    'name',
    'language',
    'category',
    'status',
    'variableNames',
    'parameterBindings',
    'hasMediaHeader',
    'buttonKinds',
    'providerUpdatedAt',
    'syncedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'providerTemplateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'name': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z0-9_]{1,512}\$',
    },
    'language': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z]{2,3}(?:_[A-Za-z]{2})?\$',
    },
    'category': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'MARKETING',
        'UTILITY',
        'AUTHENTICATION',
        'UNKNOWN',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'APPROVED',
        'PENDING',
        'REJECTED',
        'PAUSED',
        'DISABLED',
        'DELETED',
        'UNKNOWN',
      ],
    },
    'variableNames': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
      },
    },
    'parameterBindings': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'variableName',
          'component',
          'position',
          'buttonIndex',
        ],
        'properties': <String, Object?>{
          'variableName': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
          },
          'component': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'header',
              'body',
              'button',
            ],
          },
          'position': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 19,
          },
          'buttonIndex': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9,
          },
        },
      },
    },
    'hasMediaHeader': <String, Object?>{
      'type': 'boolean',
    },
    'buttonKinds': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'URL',
          'PHONE_NUMBER',
          'QUICK_REPLY',
          'COPY_CODE',
          'UNKNOWN',
        ],
      },
    },
    'buttonLabels': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': <Object?>[
          'string',
          'null',
        ],
        'minLength': 1,
        'maxLength': 1024,
      },
    },
    'parameterFormat': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'NAMED',
        'POSITIONAL',
        'UNKNOWN',
      ],
    },
    'buttonUrls': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': <Object?>[
          'string',
          'null',
        ],
        'minLength': 1,
        'maxLength': 2048,
      },
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'providerUpdatedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'syncedAt': <String, Object?>{
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
