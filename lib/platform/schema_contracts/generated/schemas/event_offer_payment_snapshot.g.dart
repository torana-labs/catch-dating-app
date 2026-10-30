// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_offer_payment_snapshot.schema.json.

const schemaEventOfferPaymentSnapshotSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_offer_payment_snapshot.schema.json',
  'title': 'EventOfferPaymentSnapshot',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventPaymentRevision',
    'eventPaymentHash',
    'expectedAmountMinor',
    'currency',
    'reusablePaymentPageUrl',
    'paymentInstructions',
    'messageTemplate',
    'expiresAtMillis',
    'collectionMode',
    'personalPaymentLink',
  ],
  'properties': <String, Object?>{
    'eventPaymentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'eventPaymentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'expectedAmountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
    },
    'currency': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reusablePaymentPageUrl': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2048,
          'format': 'uri',
          'pattern': '^https://',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'paymentInstructions': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'messageTemplate': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'collectionMode': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'manualInstructions',
            'reusablePage',
            'personalRequest',
            'catchCheckout',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'personalPaymentLink': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2048,
          'format': 'uri',
          'pattern': '^https://',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
