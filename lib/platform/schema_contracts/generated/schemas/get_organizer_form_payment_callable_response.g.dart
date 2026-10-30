// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_form_payment_response.schema.json.

const schemaGetOrganizerFormPaymentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_form_payment_response.schema.json',
  'title': 'GetOrganizerFormPaymentCallableResponse',
  'description': 'Owner-only safe payment projection.',
  'allOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'paymentId',
        'status',
        'amountPaise',
        'currency',
        'mode',
        'refundPolicy',
        'refundedAmountPaise',
        'checkout',
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
        'amountPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 100,
          'maximum': 10000000,
        },
        'currency': <String, Object?>{
          'const': 'INR',
        },
        'mode': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'test',
            'live',
          ],
        },
        'refundPolicy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'refundedAmountPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'checkout': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'publicToken',
                'orderId',
                'amountPaise',
                'currency',
                'description',
                'expiresAtMillis',
              ],
              'properties': <String, Object?>{
                'publicToken': <String, Object?>{
                  'type': 'string',
                  'pattern': '^rzp_(test|live)_(oauth_)?[A-Za-z0-9]+\$',
                },
                'orderId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^order_[A-Za-z0-9]+\$',
                },
                'amountPaise': <String, Object?>{
                  'type': 'integer',
                  'minimum': 100,
                  'maximum': 10000000,
                },
                'currency': <String, Object?>{
                  'const': 'INR',
                },
                'description': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'expiresAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'receipt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'responseId',
                'formId',
                'versionId',
                'status',
                'submittedAtMillis',
                'withdrawalToken',
                'completion',
              ],
              'properties': <String, Object?>{
                'responseId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'formId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'versionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'submitted',
                    'withdrawn',
                  ],
                },
                'submittedAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'withdrawalToken': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^[A-Za-z0-9_-]{32,160}\$',
                },
                'completion': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'title',
                    'message',
                    'actionKind',
                    'actionLabel',
                    'actionUrl',
                  ],
                  'properties': <String, Object?>{
                    'title': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    'message': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 1000,
                    },
                    'actionKind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'none',
                        'externalUrl',
                        'event',
                        'eventRuntime',
                      ],
                    },
                    'actionLabel': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 80,
                    },
                    'actionUrl': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'format': 'uri',
                      'maxLength': 500,
                    },
                  },
                },
                'profileReviewAvailable': <String, Object?>{
                  'type': 'boolean',
                  'description': 'True only when the verified respondent has an active owned profile proposal to review. Not a claim or sharing grant.',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  ],
};
