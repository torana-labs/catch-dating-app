// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_offer_manual_payment.schema.json.

const schemaEventOfferManualPaymentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_offer_manual_payment.schema.json',
  'title': 'EventOfferManualPayment',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'evidenceReference',
    'evidenceRecordedAtMillis',
    'reviewedByUid',
    'reviewedAtMillis',
    'reviewNote',
    'bankReceiptChecked',
    'attestedAmountMinor',
    'attestedCurrency',
    'attestedEventPaymentRevision',
    'attestedEventPaymentHash',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'none',
        'evidenceSubmitted',
        'hostAttestedReceived',
        'rejected',
      ],
    },
    'evidenceReference': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 240,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'evidenceRecordedAtMillis': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reviewedByUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reviewedAtMillis': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reviewNote': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 240,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'bankReceiptChecked': <String, Object?>{
      'type': 'boolean',
    },
    'attestedAmountMinor': <String, Object?>{
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
    'attestedCurrency': <String, Object?>{
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
    'attestedEventPaymentRevision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'attestedEventPaymentHash': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
