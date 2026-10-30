// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_payment_routing_policy_response.schema.json.

const schemaManagePaymentRoutingPolicyCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_payment_routing_policy_response.schema.json',
  'title': 'ManagePaymentRoutingPolicyCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'policyId',
    'organizerId',
    'revision',
    'formFee',
    'eventAdmission',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'policyId': <String, Object?>{
      'type': 'string',
      'pattern': '^(app|org_[a-f0-9]{64})\$',
    },
    'organizerId': <String, Object?>{
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'formFee': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'route',
              ],
              'properties': <String, Object?>{
                'route': <String, Object?>{
                  'const': 'disabled',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'route',
                'mode',
                'currency',
                'merchantCountry',
              ],
              'properties': <String, Object?>{
                'route': <String, Object?>{
                  'enum': <Object?>[
                    'razorpayRoute',
                    'razorpayOAuth',
                    'stripeConnectDirect',
                    'stripeConnectDestination',
                  ],
                },
                'mode': <String, Object?>{
                  'enum': <Object?>[
                    'test',
                    'live',
                  ],
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'merchantCountry': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{2}\$',
                },
              },
            },
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'eventAdmission': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'route',
              ],
              'properties': <String, Object?>{
                'route': <String, Object?>{
                  'const': 'disabled',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'route',
                'mode',
                'currency',
                'merchantCountry',
              ],
              'properties': <String, Object?>{
                'route': <String, Object?>{
                  'enum': <Object?>[
                    'razorpayRoute',
                    'razorpayOAuth',
                    'stripeConnectDirect',
                    'stripeConnectDestination',
                  ],
                },
                'mode': <String, Object?>{
                  'enum': <Object?>[
                    'test',
                    'live',
                  ],
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'merchantCountry': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{2}\$',
                },
              },
            },
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'updatedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
  },
};
