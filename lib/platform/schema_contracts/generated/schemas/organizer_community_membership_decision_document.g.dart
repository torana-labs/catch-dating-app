// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_community_membership_decisions.schema.json.

const schemaOrganizerCommunityMembershipDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_community_membership_decisions.schema.json',
  'title': 'OrganizerCommunityMembershipDecisionDocument',
  'description': 'Immutable exact-request membership decision; replay never restores an older current entitlement.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'uid',
    'membershipId',
    'requestId',
    'requestHash',
    'actorUid',
    'action',
    'reason',
    'previousState',
    'expectedRevision',
    'resultingRevision',
    'source',
    'decidedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^ocm_[a-f0-9]{64}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'grant',
        'revoke',
      ],
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'previousState': <String, Object?>{
      'enum': <Object?>[
        'none',
        'active',
        'revoked',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740989,
    },
    'resultingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
    },
    'source': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'applicationId',
        'responseId',
        'formVersionId',
        'applicationRevision',
      ],
      'properties': <String, Object?>{
        'applicationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formVersionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'applicationRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740990,
        },
      },
    },
    'decidedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'organizerCommunityMembershipDecisions',
  'x-firestore-path': 'organizerCommunityMembershipDecisions/{decisionId}',
  'x-owner': 'decideOrganizerCommunityMembership',
};
