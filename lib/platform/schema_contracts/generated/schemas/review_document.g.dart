// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/reviews.schema.json.

const schemaReviewDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/reviews.schema.json',
  'title': 'ReviewDocument',
  'description': 'Canonical organizer review stored at reviews/{reviewId}. Verified reviews come from attended Catch events; unverified reviews can come from public listing pages.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'reviews',
  'x-firestore-path': 'reviews/{reviewId}',
  'x-document-id-field': 'id',
  'x-owner': 'review mutation callables; aggregate stats are trigger-owned',
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'required': <Object?>[
    'organizerId',
    'reviewerUserId',
    'reviewerName',
    'rating',
    'comment',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'reviewerUserId': <String, Object?>{
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
      'description': 'Catch user id for signed-in reviewers. Null for anonymous public listing reviews.',
      'x-catch-ownership': 'callable-owned',
    },
    'reviewerName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'rating': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 5,
      'x-catch-ownership': 'callable-owned',
    },
    'comment': <String, Object?>{
      'type': 'string',
      'maxLength': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'verificationStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'verified',
        'unverified',
      ],
      'description': 'Verified reviews are created only after attended Catch events; public listing reviews are unverified.',
      'x-catch-ownership': 'callable-owned',
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchEvent',
        'publicListing',
      ],
      'description': 'Submission surface that created the review.',
      'x-catch-ownership': 'callable-owned',
    },
    'moderationStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'published',
        'pending',
        'rejected',
      ],
      'description': 'Public rendering status for organizer listing pages.',
      'x-catch-ownership': 'callable-owned',
    },
    'isAnonymous': <String, Object?>{
      'type': 'boolean',
      'description': 'True when the public display name should be the anonymous fallback rather than a user-supplied or profile name.',
      'x-catch-ownership': 'callable-owned',
    },
    'submittedFromPath': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'description': 'Website path that submitted an unverified public listing review.',
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
      'x-catch-ownership': 'callable-owned',
    },
    'ownerResponse': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'hostUserId',
        'hostName',
        'hostAvatarUrl',
        'message',
        'createdAt',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'hostUserId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'callable-owned',
        },
        'hostName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'x-catch-ownership': 'callable-owned',
        },
        'hostAvatarUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'x-catch-ownership': 'callable-owned',
        },
        'message': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
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
    },
    'synthetic': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo seed marker used for cleanup and diagnostics.',
    },
    'seedPrefix': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed prefix used for cleanup and diagnostics.',
    },
    'scenario': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed scenario name used for cleanup and diagnostics.',
    },
    'demoOps': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo-operations marker used for cleanup and diagnostics.',
    },
    'demoOpsId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Internal demo-operations id used for cleanup and diagnostics.',
    },
    'demoOpsCommand': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'description': 'Internal demo-operations command name used for cleanup and diagnostics.',
    },
  },
};
