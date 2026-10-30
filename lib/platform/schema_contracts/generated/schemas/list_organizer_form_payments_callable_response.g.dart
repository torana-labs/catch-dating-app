// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_form_payments_response.schema.json.

const schemaListOrganizerFormPaymentsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_form_payments_response.schema.json',
  'title': 'ListOrganizerFormPaymentsCallableResponse',
  'description': 'Minimal organizer fee records. No private credential, draft token, unsubmitted answers or respondent identity is exposed.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'paymentId',
          'status',
          'mode',
          'amountPaise',
          'currency',
          'refundedAmountPaise',
          'createdAtMillis',
          'updatedAtMillis',
          'capturedAtMillis',
          'submittedAtMillis',
          'responseId',
          'providerOrderId',
          'providerPaymentId',
          'providerRefundId',
          'receipt',
        ],
        'properties': <String, Object?>{
          'paymentId': <String, Object?>{
            'type': 'string',
            'pattern': '^fp_[a-f0-9]{32}\$',
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'creatingOrder',
              'orderUnknown',
              'checkoutReady',
              'verifying',
              'captured',
              'submitted',
              'failed',
              'expired',
              'refundPending',
              'refunded',
              'reviewRequired',
            ],
            'type': 'string',
          },
          'mode': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'test',
              'live',
            ],
          },
          'amountPaise': <String, Object?>{
            'type': 'integer',
            'minimum': 100,
            'maximum': 10000000,
          },
          'currency': <String, Object?>{
            'const': 'INR',
          },
          'refundedAmountPaise': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 10000000,
          },
          'createdAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'capturedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'submittedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'responseId': <String, Object?>{
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
          },
          'providerOrderId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'providerPaymentId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'providerRefundId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'receipt': <String, Object?>{
            'type': 'string',
            'pattern': '^cfp_[a-f0-9]{32}\$',
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
