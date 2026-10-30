// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_event_membership_rules_response.schema.json.

const schemaManageEventMembershipRulesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_event_membership_rules_response.schema.json',
  'title': 'ManageEventMembershipRulesCallableResponse',
  'description': 'The event\'s current membership rules and the organizer\'s non-archived plans the editor can reference.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'rules',
    'plans',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'rules': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'memberPriceOverrides',
            'earlyAccessHours',
            'generalSaleOpensAtMillis',
            'membersOnly',
            'revision',
          ],
          'properties': <String, Object?>{
            'memberPriceOverrides': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'items': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'planId',
                      'percentOff',
                    ],
                    'properties': <String, Object?>{
                      'planId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                      },
                      'percentOff': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'planId',
                      'priceInPaise',
                    ],
                    'properties': <String, Object?>{
                      'planId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                      },
                      'priceInPaise': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100000000,
                      },
                    },
                  },
                ],
              },
            },
            'earlyAccessHours': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'null',
                },
                <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 168,
                },
              ],
            },
            'generalSaleOpensAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'membersOnly': <String, Object?>{
              'type': 'boolean',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740990,
            },
          },
        },
      ],
    },
    'plans': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'planId',
          'name',
          'status',
          'benefits',
        ],
        'properties': <String, Object?>{
          'planId': <String, Object?>{
            'type': 'string',
            'pattern': '^hmp_[A-Za-z0-9]{20}\$',
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'draft',
              'published',
              'archived',
            ],
          },
          'benefits': <String, Object?>{
            'type': 'array',
            'maxItems': 3,
            'items': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'type',
                    'percentOff',
                  ],
                  'properties': <String, Object?>{
                    'type': <String, Object?>{
                      'const': 'eventDiscount',
                    },
                    'percentOff': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 100,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'type',
                  ],
                  'properties': <String, Object?>{
                    'type': <String, Object?>{
                      'const': 'earlyAccess',
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'type',
                  ],
                  'properties': <String, Object?>{
                    'type': <String, Object?>{
                      'const': 'membersOnlyAccess',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};
