// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_programs.schema.json.

const schemaHostMembershipProgramDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_programs.schema.json',
  'title': 'HostMembershipProgramDocument',
  'description': 'Server-owned per-organizer paid membership program: the payment provider binding snapshot taken when the program was enabled, the host-wide billing pause and member counts.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipPrograms',
  'x-firestore-path': 'hostMembershipPrograms/{organizerId}',
  'x-owner': 'manageHostMembershipProgram callable and processHostMembershipBillingPause schedule',
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'state',
    'payment',
    'billingPause',
    'memberCount',
    'revision',
    'createdAtMillis',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'enabled',
        'disabled',
      ],
      'x-catch-ownership': 'server-only',
    },
    'payment': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'provider',
        'providerAccountId',
        'bindingId',
        'mode',
      ],
      'properties': <String, Object?>{
        'provider': <String, Object?>{
          'enum': <Object?>[
            'razorpay',
          ],
        },
        'providerAccountId': <String, Object?>{
          'type': 'string',
          'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
        },
        'bindingId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'mode': <String, Object?>{
          'enum': <Object?>[
            'test',
            'live',
          ],
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'billingPause': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'state',
        'requestedAtMillis',
        'requestedBy',
        'processedCount',
        'cursor',
      ],
      'properties': <String, Object?>{
        'state': <String, Object?>{
          'enum': <Object?>[
            'active',
            'pausing',
            'paused',
            'resuming',
          ],
        },
        'requestedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'requestedBy': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 128,
        },
        'processedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'cursor': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'memberCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10000000,
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
      'x-catch-ownership': 'server-only',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
