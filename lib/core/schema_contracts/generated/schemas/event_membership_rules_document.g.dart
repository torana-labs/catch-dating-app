// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_membership_rules.schema.json.

const schemaEventMembershipRulesDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_membership_rules.schema.json',
  'title': 'EventMembershipRulesDocument',
  'description': 'Paid-membership rules for one event: per-plan member price overrides (0 or 100% off = included), an early-access window anchored when first enabled, and a paid-members-only flag. Kept outside eventPolicy so it never changes the seat policy hash or lock.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventMembershipRules',
  'x-firestore-path': 'eventMembershipRules/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'manageEventMembershipRules callable',
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'eventId',
    'memberPriceOverrides',
    'earlyAccess',
    'membersOnly',
    'revision',
    'updatedAtMillis',
    'updatedBy',
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
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
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
      'x-catch-ownership': 'callable-owned',
    },
    'earlyAccess': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'hours',
            'anchorMillis',
            'generalSaleOpensAtMillis',
          ],
          'properties': <String, Object?>{
            'hours': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 168,
            },
            'anchorMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'generalSaleOpensAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
          },
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'membersOnly': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'callable-owned',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'callable-owned',
    },
    'updatedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
