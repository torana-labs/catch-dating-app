// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_payment_terms.schema.json.

const schemaEventPaymentTermsSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_payment_terms.schema.json',
  'title': 'EventPaymentTerms',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'revision',
    'preferredCollection',
    'reusablePaymentPage',
    'paymentInstructions',
    'expectedAmountMinor',
    'currency',
    'offerValidityMinutes',
    'offerMessageTemplate',
    'sourceDefaultsRevision',
    'sourceDefaultsHash',
    'fieldSources',
  ],
  'properties': <String, Object?>{
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'preferredCollection': <String, Object?>{
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
    'reusablePaymentPage': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'url',
            'reusableForEvents',
          ],
          'properties': <String, Object?>{
            'url': <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            'reusableForEvents': <String, Object?>{
              'type': 'boolean',
              'const': true,
            },
          },
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
    'expectedAmountMinor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
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
    'offerValidityMinutes': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 5,
          'maximum': 10080,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'offerMessageTemplate': <String, Object?>{
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
    'sourceDefaultsRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'sourceDefaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'fieldSources': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'preferredCollection',
        'reusablePaymentPage',
        'paymentInstructions',
        'expectedAmountMinor',
        'currency',
        'offerValidityMinutes',
        'offerMessageTemplate',
      ],
      'properties': <String, Object?>{
        'preferredCollection': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'reusablePaymentPage': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'paymentInstructions': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'expectedAmountMinor': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'currency': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'offerValidityMinutes': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
        'offerMessageTemplate': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
  },
};
