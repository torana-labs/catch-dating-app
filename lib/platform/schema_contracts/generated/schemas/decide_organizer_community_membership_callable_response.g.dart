// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_community_membership_decision_response.schema.json.

const schemaDecideOrganizerCommunityMembershipCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_community_membership_decision_response.schema.json',
  'title': 'DecideOrganizerCommunityMembershipCallableResponse',
  'description': 'Sanitized decision result and current entitlement; an exact replay may refer to an older decision revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'membershipId',
    'decisionId',
    'decisionRevision',
    'currentRevision',
    'currentState',
    'replayed',
  ],
  'properties': <String, Object?>{
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^ocm_[a-f0-9]{64}\$',
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'pattern': '^ocmd_[a-f0-9]{64}\$',
    },
    'decisionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
    },
    'currentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
    },
    'currentState': <String, Object?>{
      'enum': <Object?>[
        'active',
        'revoked',
      ],
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
