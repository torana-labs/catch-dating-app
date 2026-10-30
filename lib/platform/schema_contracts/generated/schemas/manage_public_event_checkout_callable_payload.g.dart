// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_public_event_checkout_payload.schema.json.

const schemaManagePublicEventCheckoutCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_public_event_checkout_payload.schema.json',
  'title': 'ManagePublicEventCheckoutCallablePayload',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'eventId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'quote',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'eventId',
        'requestId',
        'displayName',
        'reviewedQuote',
        'inviteToken',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'prepare',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'reviewedQuote': <String, Object?>{
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
        'inviteToken': <String, Object?>{
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
          'pattern': '^pp_[a-f0-9]{32}\$',
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
          'pattern': '^pp_[a-f0-9]{32}\$',
        },
        'expectedRefundAmountPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'eventId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'find',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  ],
};
