// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_plans.schema.json.

const schemaHostMembershipPlanDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_plans.schema.json',
  'title': 'HostMembershipPlanDocument',
  'description': 'One paid membership tier sold by an organizer. Published plans are readable by signed-in users; only the plans callable writes them. Price changes create a new provider price and leave existing members on the price they bought.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipPlans',
  'x-firestore-path': 'hostMembershipPlans/{planId}',
  'x-document-id-field': 'planId',
  'x-owner': 'manageHostMembershipPlans callable; member counts by the membership state machine',
  'required': <Object?>[
    'schemaVersion',
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
    'createdAtMillis',
    'updatedAtMillis',
    'publishedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
      'x-catch-ownership': 'callable-owned',
    },
    'description': <String, Object?>{
      'type': 'string',
      'maxLength': 500,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'draft',
        'published',
        'archived',
      ],
      'x-catch-ownership': 'callable-owned',
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
            'providerPriceIds',
            'revision',
          ],
          'properties': <String, Object?>{
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 1000,
              'maximum': 1500000,
              'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
            },
            'providerPriceIds': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'razorpay': <String, Object?>{
                  'type': 'string',
                  'pattern': '^plan_[A-Za-z0-9]{6,40}\$',
                },
              },
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740990,
            },
            'providerAccountId': <String, Object?>{
              'description': 'Account the provider plan was created on. Absent on prices created under the original platform-account model.',
              'type': 'string',
              'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
            },
          },
        },
        'annual': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'amountPaise',
            'providerPriceIds',
            'revision',
          ],
          'properties': <String, Object?>{
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 1000,
              'maximum': 1500000,
              'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
            },
            'providerPriceIds': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'razorpay': <String, Object?>{
                  'type': 'string',
                  'pattern': '^plan_[A-Za-z0-9]{6,40}\$',
                },
              },
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740990,
            },
            'providerAccountId': <String, Object?>{
              'description': 'Account the provider plan was created on. Absent on prices created under the original platform-account model.',
              'type': 'string',
              'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
            },
          },
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'memberCap': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 100000,
      'x-catch-ownership': 'callable-owned',
    },
    'trialDays': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 30,
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'perks': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
      },
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'activeMemberCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10000000,
      'x-catch-ownership': 'server-only',
    },
    'sortOrder': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
      'x-catch-ownership': 'callable-owned',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
    'publishedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
