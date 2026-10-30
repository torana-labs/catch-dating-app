// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_charges.schema.json.

const schemaHostMembershipChargeDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_charges.schema.json',
  'title': 'HostMembershipChargeDocument',
  'description': 'Server-only ledger of one captured membership charge and its Route transfer to the host linked account minus the platform fee. Keyed by the provider payment id.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipCharges',
  'x-firestore-path': 'hostMembershipCharges/{chargeId}',
  'x-document-id-field': 'chargeId',
  'x-owner': 'membership webhook and reconcileHostMembershipCharges schedule',
  'required': <Object?>[
    'schemaVersion',
    'membershipId',
    'organizerId',
    'uid',
    'provider',
    'providerSubscriptionId',
    'amountPaise',
    'feePaise',
    'transferAmountPaise',
    'periodStartMillis',
    'periodEndMillis',
    'providerAccountId',
    'mode',
    'transfer',
    'createdAtMillis',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^hm_[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'provider': <String, Object?>{
      'enum': <Object?>[
        'razorpay',
      ],
      'x-catch-ownership': 'server-only',
    },
    'providerSubscriptionId': <String, Object?>{
      'type': 'string',
      'pattern': '^sub_[A-Za-z0-9]{6,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'amountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 100,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'feePaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'transferAmountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'periodStartMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'periodEndMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'mode': <String, Object?>{
      'enum': <Object?>[
        'test',
        'live',
      ],
      'x-catch-ownership': 'server-only',
    },
    'transfer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'state',
        'transferId',
        'attempts',
        'lastError',
      ],
      'properties': <String, Object?>{
        'state': <String, Object?>{
          'enum': <Object?>[
            'pending',
            'requesting',
            'created',
            'failed',
            'notRequired',
          ],
        },
        'transferId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^trf_[A-Za-z0-9]{6,40}\$',
        },
        'attempts': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100,
        },
        'lastError': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 200,
        },
      },
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
