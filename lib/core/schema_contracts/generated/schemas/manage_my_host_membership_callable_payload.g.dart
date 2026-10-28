// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_my_host_membership_payload.schema.json.

const schemaManageMyHostMembershipCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_my_host_membership_payload.schema.json',
  'title': 'ManageMyHostMembershipCallablePayload',
  'description': 'Member self-serve: pause billing (suspends entitlements), resume, or cancel at the end of the current period.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Consumer My memberships',
  'required': <Object?>[
    'action',
    'membershipId',
  ],
  'properties': <String, Object?>{
    'action': <String, Object?>{
      'enum': <Object?>[
        'pause',
        'resume',
        'cancelAtPeriodEnd',
      ],
      'type': 'string',
    },
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^hm_[a-f0-9]{64}\$',
    },
  },
};
