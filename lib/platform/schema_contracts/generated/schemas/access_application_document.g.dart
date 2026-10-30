// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/access_applications.schema.json.

const schemaAccessApplicationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/access_applications.schema.json',
  'title': 'AccessApplicationDocument',
  'description': 'Owner-submitted launch access application stored at accessApplications/{uid}; review and cohort fields are admin-owned.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'accessApplications',
  'x-firestore-path': 'accessApplications/{uid}',
  'x-owner': 'authenticated applicant owns application fields while editable; admin callables own review, cohort, and activation fields',
  'required': <Object?>[
    'applicationVersion',
    'status',
    'city',
    'role',
    'eventTypes',
    'availabilityWindows',
    'wantsToHost',
    'submissionCount',
    'createdAt',
    'submittedAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'applicationVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'client-writable',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'waitlisted',
        'invited',
        'approvedForProfile',
        'activeMember',
        'paused',
        'notSelectedYet',
      ],
      'x-catch-ownership': 'admin-callable-owned',
    },
    'city': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      'x-catch-ownership': 'client-writable',
    },
    'role': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'member',
        'host',
        'both',
      ],
      'x-catch-ownership': 'client-writable',
    },
    'eventTypes': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'runClub',
          'walkingSocial',
          'coffee',
          'boardGames',
          'fitnessClass',
          'food',
          'culture',
        ],
      },
      'minItems': 1,
      'maxItems': 7,
      'uniqueItems': true,
      'x-catch-ownership': 'client-writable',
    },
    'availabilityWindows': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'weekdayMornings',
          'weekdayEvenings',
          'saturdayMornings',
          'saturdayEvenings',
          'sundayMornings',
          'sundayEvenings',
        ],
      },
      'minItems': 1,
      'maxItems': 6,
      'uniqueItems': true,
      'x-catch-ownership': 'client-writable',
    },
    'wantsToHost': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'client-writable',
    },
    'inviteCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 64,
      'pattern': '^[A-Za-z0-9_-]*\$',
      'x-catch-ownership': 'client-writable',
    },
    'instagramHandle': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 30,
      'pattern': '^[A-Za-z0-9._]{0,30}\$',
      'x-catch-ownership': 'client-writable',
    },
    'referralSource': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'x-catch-ownership': 'client-writable',
    },
    'whyCatch': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 12,
      'maxLength': 1000,
      'x-catch-ownership': 'client-writable',
    },
    'cohortId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'admin-callable-owned',
    },
    'hostUserId': <String, Object?>{
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
      'x-catch-ownership': 'admin-callable-owned',
    },
    'reviewerUid': <String, Object?>{
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
      'x-catch-ownership': 'admin-callable-owned',
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
      'x-catch-ownership': 'admin-callable-owned',
    },
    'submissionCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'client-writable',
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
      'x-catch-ownership': 'client-server-timestamp',
    },
    'submittedAt': <String, Object?>{
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
      'x-catch-ownership': 'client-server-timestamp',
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
      'x-catch-ownership': 'client-server-timestamp',
    },
    'reviewedAt': <String, Object?>{
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
      'x-catch-ownership': 'admin-callable-owned',
    },
  },
};
