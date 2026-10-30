// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_event_offer_checkout_payload.schema.json.

const schemaManageEventOfferCheckoutCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_event_offer_checkout_payload.schema.json',
  'title': 'ManageEventOfferCheckoutCallablePayload',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'token',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'claim',
        },
        'token': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'grantId',
        'requestId',
        'cancellationPolicy',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'prepare',
        },
        'grantId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{8,120}\$',
        },
        'cancellationPolicy': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'refundDeadlineMillis',
            'eventStartsAtMillis',
          ],
          'properties': <String, Object?>{
            'refundDeadlineMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'eventStartsAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
          },
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'grantId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'find',
        },
        'grantId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'paymentId',
        'callback',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'status',
        },
        'paymentId': <String, Object?>{
          'type': 'string',
          'pattern': '^ep_[a-f0-9]{32}\$',
        },
        'callback': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'paymentId',
                'signature',
              ],
              'properties': <String, Object?>{
                'paymentId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^pay_[A-Za-z0-9]+\$',
                },
                'signature': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-fA-F0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'paymentId',
        'expectedRefundAmountPaise',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'cancelAdmission',
        },
        'paymentId': <String, Object?>{
          'type': 'string',
          'pattern': '^ep_[a-f0-9]{32}\$',
        },
        'expectedRefundAmountPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'grantId',
        'requestId',
        'expectedOfferGeneration',
        'expectedOfferRevision',
        'expectedLedgerRevision',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'acceptFree',
        },
        'grantId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
        },
        'expectedOfferGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'expectedOfferRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'expectedLedgerRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'includeEventAccess': <String, Object?>{
          'type': 'boolean',
          'description': 'Opt in to additive event access metadata; omitted clients retain the prior paid receipt shape.',
        },
      },
    },
  ],
};
