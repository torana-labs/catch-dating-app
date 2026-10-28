// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_my_host_membership_response.schema.json.

const schemaManageMyHostMembershipCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_my_host_membership_response.schema.json',
  'title': 'ManageMyHostMembershipCallableResponse',
  'description': 'Membership status after the member action is applied with the provider.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'membershipId',
    'status',
    'cancelAtPeriodEnd',
    'currentPeriodEndMillis',
  ],
  'properties': <String, Object?>{
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^hm_[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'trialing',
        'active',
        'past_due',
        'paused',
        'canceling',
        'expired',
      ],
    },
    'cancelAtPeriodEnd': <String, Object?>{
      'type': 'boolean',
    },
    'currentPeriodEndMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
