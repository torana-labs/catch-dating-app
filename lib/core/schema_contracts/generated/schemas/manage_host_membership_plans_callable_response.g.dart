// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_host_membership_plans_response.schema.json.

const schemaManageHostMembershipPlansCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_host_membership_plans_response.schema.json',
  'title': 'ManageHostMembershipPlansCallableResponse',
  'description': 'Every plan of one organizer in sort order, after the requested action. Provider price ids are never returned.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'plans',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'plans': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'planId',
          'organizerId',
          'name',
          'description',
          'status',
          'prices',
          'memberCap',
          'trialDays',
          'benefits',
          'perks',
          'limits',
          'activeMemberCount',
          'sortOrder',
          'revision',
          'publishedAtMillis',
        ],
        'properties': <String, Object?>{
          'planId': <String, Object?>{
            'type': 'string',
            'pattern': '^hmp_[A-Za-z0-9]{20}\$',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'description': <String, Object?>{
            'type': 'string',
            'maxLength': 500,
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'draft',
              'published',
              'archived',
            ],
          },
          'prices': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'minProperties': 1,
            'properties': <String, Object?>{
              'monthly': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'amountPaise',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'amountPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1000,
                    'maximum': 1500000,
                    'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740990,
                  },
                },
              },
              'annual': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'amountPaise',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'amountPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1000,
                    'maximum': 1500000,
                    'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740990,
                  },
                },
              },
            },
          },
          'memberCap': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 100000,
          },
          'trialDays': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 30,
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
          'perks': <String, Object?>{
            'type': 'array',
            'maxItems': 8,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
          },
          'limits': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'maxUpcomingMemberPricedBookings',
            ],
            'properties': <String, Object?>{
              'maxUpcomingMemberPricedBookings': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 1,
                'maximum': 20,
              },
            },
          },
          'activeMemberCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 10000000,
          },
          'sortOrder': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740990,
          },
          'publishedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
  },
};
