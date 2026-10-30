// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_payment_accounts.schema.json.

const schemaHostPaymentAccountDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_payment_accounts.schema.json',
  'title': 'HostPaymentAccountDocument',
  'description': 'Server-owned payout-provider account state. New documents use hostPaymentAccounts/{uid}_{provider}; legacy Stripe documents at {uid} remain readable during migration.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostPaymentAccounts',
  'x-firestore-path': 'hostPaymentAccounts/{accountId}',
  'x-document-id-field': 'id',
  'x-owner': 'Stripe Connect and Razorpay Route onboarding, refresh, and webhook callables',
  'required': <Object?>[
    'userId',
    'provider',
    'country',
    'defaultCurrency',
    'providerAccountId',
    'stripeAccountId',
    'razorpayAccountId',
    'chargesEnabled',
    'payoutsEnabled',
    'detailsSubmitted',
    'onboardingStatus',
    'requirementsCurrentlyDue',
    'requirementsPastDue',
    'requirementsPendingVerification',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'userId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'provider': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'razorpay',
        'stripe',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'country': <String, Object?>{
      'type': 'string',
      'minLength': 2,
      'maxLength': 2,
      'x-catch-ownership': 'callable-owned',
    },
    'defaultCurrency': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 3,
      'x-catch-ownership': 'callable-owned',
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'stripeAccountId': <String, Object?>{
      'type': 'string',
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'razorpayAccountId': <String, Object?>{
      'type': 'string',
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'razorpayProductId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'chargesEnabled': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'payoutsEnabled': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'detailsSubmitted': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'onboardingStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notStarted',
        'pending',
        'complete',
        'restricted',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'disabledReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'requirementsCurrentlyDue': <String, Object?>{
      'type': 'array',
      'maxItems': 80,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'requirementsPastDue': <String, Object?>{
      'type': 'array',
      'maxItems': 80,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'requirementsPendingVerification': <String, Object?>{
      'type': 'array',
      'maxItems': 80,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'lastStripeEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
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
