// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_entitlement_response.schema.json.

const schemaOrganizerEntitlementCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_entitlement_response.schema.json',
  'title': 'OrganizerEntitlementCallableResponse',
  'description': 'Bounded manager-facing entitlement projection: grants without admin internals, metered usage, and the versioned SKU catalog so clients render limits and prices without a second fetch.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'catalogVersion',
    'revision',
    'grants',
    'meters',
    'skuCatalog',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'catalogVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'grants': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'grantId',
          'sku',
          'skuLabel',
          'unit',
          'quantityTotal',
          'quantityConsumed',
          'quantityRemaining',
          'validFromMillis',
          'validUntilMillis',
          'source',
          'active',
          'revoked',
        ],
        'properties': <String, Object?>{
          'grantId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'sku': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'wedding_essentials',
              'wedding_pro',
              'wedding_signature',
              'wedding_transport_addon',
              'planner_annual',
            ],
          },
          'skuLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'unit': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'program',
              'organizerYear',
            ],
          },
          'quantityTotal': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'quantityConsumed': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'quantityRemaining': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'validFromMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'validUntilMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'manualInvoice',
              'checkout',
              'promo',
            ],
          },
          'active': <String, Object?>{
            'type': 'boolean',
          },
          'revoked': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'meters': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'flightDaysUsed',
        'waConversationsUsed',
      ],
      'properties': <String, Object?>{
        'flightDaysUsed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'waConversationsUsed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
      },
    },
    'skuCatalog': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'patternProperties': <String, Object?>{
        '^(wedding_essentials|wedding_pro|wedding_signature|wedding_transport_addon|planner_annual)\$': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'label',
            'unit',
            'priceMinor',
            'currency',
            'limits',
            'capabilitiesAllowed',
            'includedFlightDays',
            'includedWaConversations',
            'stakeholderSeats',
          ],
          'properties': <String, Object?>{
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'unit': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'program',
                'organizerYear',
              ],
            },
            'priceMinor': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 100000000,
            },
            'currency': <String, Object?>{
              'type': 'string',
              'const': 'INR',
            },
            'limits': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'guests',
                'functions',
                'staffAssignments',
                'momentsPerFunction',
              ],
              'properties': <String, Object?>{
                'guests': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 1000000,
                },
                'functions': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 1000000,
                },
                'staffAssignments': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 1000000,
                },
                'momentsPerFunction': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 1000000,
                },
              },
            },
            'capabilitiesAllowed': <String, Object?>{
              'type': 'array',
              'maxItems': 4,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'arrivalsTransport',
                  'accommodation',
                  'forms',
                  'messaging',
                ],
              },
            },
            'includedFlightDays': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'includedWaConversations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            'stakeholderSeats': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 1000000,
            },
          },
        },
      },
    },
  },
};
