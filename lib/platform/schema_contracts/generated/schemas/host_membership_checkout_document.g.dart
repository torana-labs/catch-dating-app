// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_checkouts.schema.json.

const schemaHostMembershipCheckoutDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_checkouts.schema.json',
  'title': 'HostMembershipCheckoutDocument',
  'description': 'One membership purchase attempt: the provider subscription awaiting mandate authorization. The buyer may read their own checkout to follow progress; open checkouts reserve plan capacity until expiry.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipCheckouts',
  'x-firestore-path': 'hostMembershipCheckouts/{checkoutId}',
  'x-document-id-field': 'checkoutId',
  'x-owner': 'manageHostMembershipCheckout callable and the membership webhook',
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'planId',
    'uid',
    'interval',
    'priceInPaise',
    'state',
    'provider',
    'providerSubscriptionId',
    'authorizationUrl',
    'expiresAtMillis',
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
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^hmp_[A-Za-z0-9]{20}\$',
      'x-catch-ownership': 'server-only',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'interval': <String, Object?>{
      'enum': <Object?>[
        'monthly',
        'annual',
      ],
      'x-catch-ownership': 'server-only',
    },
    'priceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 1000,
      'maximum': 1500000,
      'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
      'x-catch-ownership': 'server-only',
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'creating',
        'open',
        'authorized',
        'expired',
        'failed',
      ],
      'x-catch-ownership': 'server-only',
    },
    'provider': <String, Object?>{
      'enum': <Object?>[
        'razorpay',
      ],
      'x-catch-ownership': 'server-only',
    },
    'providerSubscriptionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^sub_[A-Za-z0-9]{6,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'payment': <String, Object?>{
      'description': 'The program binding the subscription was created on. Absent on checkouts created under the original platform-account model.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'provider',
        'moneyFlow',
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
        'moneyFlow': <String, Object?>{
          'description': 'hostCollected: the guest pays the organizer\'s own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch\'s platform account collects and transfers the organizer\'s share (Razorpay Route), deducting any at-source fee.',
          'enum': <Object?>[
            'hostCollected',
            'platformSplit',
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
    'authorizationUrl': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'pattern': '^https://',
      'x-catch-ownership': 'server-only',
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
