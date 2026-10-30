// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_host_membership_plans_payload.schema.json.

const schemaManageHostMembershipPlansCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_host_membership_plans_payload.schema.json',
  'title': 'ManageHostMembershipPlansCallablePayload',
  'description': 'Organizer-manager plan management: list every plan, save a draft or edit, publish (creates provider prices) and archive (stops new joins).',
  'x-owner': 'Host memberships plan editor',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'list',
        },
        'organizerId': <String, Object?>{
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
        'organizerId',
        'planId',
        'plan',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'save',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'planId': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'string',
              'pattern': '^hmp_[A-Za-z0-9]{20}\$',
            },
          ],
        },
        'plan': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'name',
            'description',
            'prices',
            'memberCap',
            'trialDays',
            'benefits',
            'perks',
            'limits',
            'sortOrder',
          ],
          'properties': <String, Object?>{
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 60,
            },
            'description': <String, Object?>{
              'type': 'string',
              'maxLength': 500,
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
                  ],
                  'properties': <String, Object?>{
                    'amountPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1000,
                      'maximum': 1500000,
                      'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
                    },
                  },
                },
                'annual': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'amountPaise',
                  ],
                  'properties': <String, Object?>{
                    'amountPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1000,
                      'maximum': 1500000,
                      'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
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
            'sortOrder': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000,
            },
          },
        },
        'expectedRevision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 9007199254740990,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'organizerId',
        'planId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'publish',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^hmp_[A-Za-z0-9]{20}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'organizerId',
        'planId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'archive',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^hmp_[A-Za-z0-9]{20}\$',
        },
      },
    },
  ],
};
