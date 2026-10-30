// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/payment_routing_snapshot.schema.json.

const schemaPaymentRoutingSnapshotSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'version',
    'purpose',
    'organizerId',
    'selection',
    'policySource',
    'appRevision',
    'organizerRevision',
    'bindingId',
    'merchantAccountId',
    'destinationAccountId',
    'configurationVersion',
    'checkoutKey',
    'amountMinor',
    'transferAmountMinor',
    'settlementHold',
  ],
  'properties': <String, Object?>{
    'version': <String, Object?>{
      'const': 1,
    },
    'amountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'transferAmountMinor': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'settlementHold': <String, Object?>{
      'type': <Object?>[
        'boolean',
        'null',
      ],
    },
    'purpose': <String, Object?>{
      'enum': <Object?>[
        'formFee',
        'eventAdmission',
      ],
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'selection': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'route',
        'mode',
        'currency',
        'merchantCountry',
      ],
      'properties': <String, Object?>{
        'route': <String, Object?>{
          'enum': <Object?>[
            'razorpayRoute',
            'razorpayOAuth',
            'stripeConnectDirect',
            'stripeConnectDestination',
          ],
        },
        'mode': <String, Object?>{
          'enum': <Object?>[
            'test',
            'live',
          ],
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'merchantCountry': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{2}\$',
        },
      },
    },
    'policySource': <String, Object?>{
      'enum': <Object?>[
        'app',
        'organizer',
        'legacy',
      ],
    },
    'appRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'organizerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'bindingId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'merchantAccountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'destinationAccountId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 160,
    },
    'configurationVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
    'checkoutKey': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 256,
    },
  },
  'title': 'PaymentRoutingSnapshot',
};
