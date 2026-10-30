// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/payment_routing_policies.schema.json.

const schemaPaymentRoutingPolicyDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/payment_routing_policies.schema.json',
  'title': 'PaymentRoutingPolicyDocument',
  'description': 'Operator-owned app defaults and organizer overrides. Null inherits at organizer scope and disables at app scope. An explicit disabled selection never inherits.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'scope',
    'organizerId',
    'revision',
    'formFee',
    'eventAdmission',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'scope': <String, Object?>{
      'enum': <Object?>[
        'app',
        'organizer',
      ],
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
      'minimum': 1,
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
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'lastMutationHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'scope': <String, Object?>{
            'const': 'app',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'null',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
          },
        },
      },
    },
  ],
  'x-firestore-collection': 'paymentRoutingPolicies',
  'x-firestore-path': 'paymentRoutingPolicies/{policyId}',
  'x-document-id-field': 'policyId',
  'x-owner': 'payment routing server operations',
};
