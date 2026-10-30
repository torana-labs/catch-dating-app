// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_public_event_checkout_response.schema.json.

const schemaManagePublicEventCheckoutCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_public_event_checkout_response.schema.json',
  'title': 'ManagePublicEventCheckoutCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'quote',
    'payment',
    'admission',
    'serverTimeMillis',
  ],
  'properties': <String, Object?>{
    'quote': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'eventName',
            'registrationRevision',
            'startTimeMillis',
            'amountPaise',
            'currency',
            'cancellationPolicy',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'eventName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'registrationRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'startTimeMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 100,
              'maximum': 100000000,
            },
            'currency': <String, Object?>{
              'const': 'INR',
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
            'listAmountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 100,
              'maximum': 100000000,
              'description': 'Present only when a paid host membership price applies: the list price the member would otherwise pay.',
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
            'eventId',
            'eventName',
            'startTimeMillis',
          ],
          'properties': <String, Object?>{
            'paymentId': <String, Object?>{
              'type': 'string',
              'pattern': '^pp_[a-f0-9]{32}\$',
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
            },
            'eventName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'startTimeMillis': <String, Object?>{
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
    'admission': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'attendeeId',
            'status',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'attendeeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'registered',
                'checkedIn',
              ],
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
  },
};
