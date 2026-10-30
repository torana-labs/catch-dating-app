// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_exports.schema.json.

const schemaOrganizerFormExportDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_exports.schema.json',
  'title': 'OrganizerFormExportDocument',
  'description': 'Asynchronous, expiring, manager-requested form response export receipt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'requestedByUid',
    'requestId',
    'format',
    'statuses',
    'versionId',
    'fromMillis',
    'toMillis',
    'status',
    'rowCount',
    'storagePath',
    'errorCode',
    'errorMessage',
    'createdAt',
    'updatedAt',
    'completedAt',
    'expiresAt',
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
    'requestedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
      ],
    },
    'statuses': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'submitted',
          'withdrawn',
        ],
      },
    },
    'versionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'fromMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'toMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'running',
        'completed',
        'failed',
        'expired',
      ],
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'storagePath': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'errorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'errorMessage': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
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
    'completedAt': <String, Object?>{
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
    'expiresAt': <String, Object?>{
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
    'responseQuery': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'QueryOrganizerFormResponsesCallablePayload',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerId',
            'formId',
            'versionId',
            'statuses',
            'predicate',
            'sort',
            'limit',
            'cursor',
          ],
          'properties': <String, Object?>{
            'organizerId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'formId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'versionId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'statuses': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 2,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'submitted',
                  'withdrawn',
                ],
              },
            },
            'predicate': <String, Object?>{
              'type': <Object?>[
                'object',
                'null',
              ],
              'maxProperties': 5,
              'additionalProperties': true,
              'description': 'Published-version-aware compiler validates ALL/ANY tree, operators, value types, sensitive exclusion, depth 3 and maximum 20 leaves before any response scan.',
            },
            'sort': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'questionId',
                'direction',
                'nulls',
              ],
              'properties': <String, Object?>{
                'questionId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'direction': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'asc',
                    'desc',
                  ],
                },
                'nulls': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'first',
                    'last',
                  ],
                },
              },
            },
            'limit': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 100,
            },
            'cursor': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 1000,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Optional exact typed filter and sort. Export covers all matches, not one page.',
    },
    'expectedResultHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Required with responseQuery; changed results fail rather than silently exporting a different set.',
    },
    'expectedQueryHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Required with responseQuery; binds the published definition and filter semantics.',
    },
  },
  'x-firestore-collection': 'organizerFormExports',
  'x-firestore-path': 'organizerFormExports/{exportId}',
  'x-document-id-field': 'exportId',
  'x-owner': 'organizer form export pipeline',
};
