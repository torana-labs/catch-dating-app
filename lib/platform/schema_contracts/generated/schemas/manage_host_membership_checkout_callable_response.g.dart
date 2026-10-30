// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_host_membership_checkout_response.schema.json.

const schemaManageHostMembershipCheckoutCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_host_membership_checkout_response.schema.json',
  'title': 'ManageHostMembershipCheckoutCallableResponse',
  'description': 'Current checkout progress and, once authorized, the resulting membership status.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'checkoutId',
    'state',
    'authorizationUrl',
    'expiresAtMillis',
    'membershipId',
    'membershipStatus',
  ],
  'properties': <String, Object?>{
    'checkoutId': <String, Object?>{
      'type': 'string',
      'pattern': '^hmc_[A-Za-z0-9]{20}\$',
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'creating',
        'open',
        'authorized',
        'expired',
        'failed',
      ],
    },
    'authorizationUrl': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'pattern': '^https://',
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'membershipId': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'string',
          'pattern': '^hm_[a-f0-9]{64}\$',
        },
      ],
    },
    'membershipStatus': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'enum': <Object?>[
            'trialing',
            'active',
            'past_due',
            'paused',
            'canceling',
            'expired',
          ],
        },
      ],
    },
  },
};
