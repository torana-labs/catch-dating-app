// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_event_offer_checkout_response.schema.json.

const schemaManageEventOfferCheckoutCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_event_offer_checkout_response.schema.json',
  'title': 'ManageEventOfferCheckoutCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'grant',
    'payment',
    'serverTimeMillis',
  ],
  'properties': <String, Object?>{
    'grant': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'grantId',
            'eventName',
            'eventId',
            'startTimeMillis',
            'amountPaise',
            'currency',
            'expiresAtMillis',
            'cancellationPolicy',
          ],
          'properties': <String, Object?>{
            'grantId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'eventName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 200,
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9_:-]+\$',
            },
            'startTimeMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            'currency': <String, Object?>{
              'const': 'INR',
            },
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
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
            'freeAdmission': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'expectedOfferGeneration',
                'expectedOfferRevision',
                'expectedLedgerRevision',
              ],
              'properties': <String, Object?>{
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
              },
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'payment': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'paymentId',
            'status',
            'amountPaise',
            'currency',
            'mode',
            'refundedAmountPaise',
            'expiresAtMillis',
            'checkout',
            'cancellationReason',
            'cancellationPolicy',
            'cancellationQuote',
          ],
          'properties': <String, Object?>{
            'paymentId': <String, Object?>{
              'type': 'string',
              'pattern': '^ep_[a-f0-9]{32}\$',
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'creatingOrder',
                'orderUnknown',
                'checkoutReady',
                'verifying',
                'captured',
                'admitted',
                'expired',
                'refundPending',
                'refunded',
                'reviewRequired',
                'failed',
                'cancelled',
              ],
            },
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 100,
              'maximum': 100000000,
            },
            'currency': <String, Object?>{
              'const': 'INR',
            },
            'mode': <String, Object?>{
              'enum': <Object?>[
                'test',
                'live',
              ],
            },
            'refundedAmountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
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
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    'orderId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^order_[A-Za-z0-9]+\$',
                    },
                    'amountPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 100,
                      'maximum': 100000000,
                    },
                    'currency': <String, Object?>{
                      'const': 'INR',
                    },
                    'description': <String, Object?>{
                      'type': 'string',
                      'maxLength': 200,
                    },
                    'expiresAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'cancellationReason': <String, Object?>{
              'enum': <Object?>[
                'eventCancelled',
                'guestCancelled',
                null,
              ],
            },
            'cancellationPolicy': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
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
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'cancellationQuote': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'refundAmountPaise',
                  ],
                  'properties': <String, Object?>{
                    'refundAmountPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 100000000,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9_:-]+\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'admission': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'attendeeId',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_:-]+\$',
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  },
};
