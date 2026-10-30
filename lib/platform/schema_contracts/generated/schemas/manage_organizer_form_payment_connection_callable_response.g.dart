// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_organizer_form_payment_connection_response.schema.json.

const schemaManageOrganizerFormPaymentConnectionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_organizer_form_payment_connection_response.schema.json',
  'title': 'ManageOrganizerFormPaymentConnectionCallableResponse',
  'description': 'Safe connection status and one-use OAuth link. No merchant credentials.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'available',
    'authorizationUrl',
    'connectionId',
    'expiresAtMillis',
    'connections',
  ],
  'properties': <String, Object?>{
    'available': <String, Object?>{
      'type': 'boolean',
    },
    'authorizationUrl': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'uri',
          'maxLength': 4000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'connectionId': <String, Object?>{
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
    'expiresAtMillis': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'connections': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'connectionId',
          'status',
          'mode',
          'accountId',
          'webhookVerified',
          'lastErrorCode',
        ],
        'properties': <String, Object?>{
          'connectionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'connecting',
              'ready',
              'needsAttention',
              'disconnected',
            ],
          },
          'mode': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'test',
              'live',
            ],
          },
          'accountId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'webhookVerified': <String, Object?>{
            'type': 'boolean',
          },
          'lastErrorCode': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'collection': <String, Object?>{
      'description': 'Selected server-owned collection route. Null preserves legacy OAuth account selection.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'route',
            'mode',
            'ready',
          ],
          'properties': <String, Object?>{
            'route': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'disabled',
                'razorpayRoute',
                'razorpayOAuth',
                'stripeConnectDirect',
                'stripeConnectDestination',
              ],
            },
            'mode': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                'test',
                'live',
                null,
              ],
            },
            'ready': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
      ],
    },
  },
};
