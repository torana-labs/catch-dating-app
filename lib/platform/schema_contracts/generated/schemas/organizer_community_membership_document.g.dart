// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_community_memberships.schema.json.

const schemaOrganizerCommunityMembershipDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_community_memberships.schema.json',
  'title': 'OrganizerCommunityMembershipDocument',
  'description': 'Current manager-controlled organizer community entitlement. Following, contact linkage, booking and attendance are separate.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'uid',
    'state',
    'revision',
    'source',
    'lastDecisionId',
    'activatedAtMillis',
    'updatedAtMillis',
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
    'state': <String, Object?>{
      'enum': <Object?>[
        'active',
        'revoked',
      ],
    },
    'revision': <String, Object?>{
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
    'lastDecisionId': <String, Object?>{
      'type': 'string',
      'pattern': '^ocmd_[a-f0-9]{64}\$',
    },
    'activatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
  'definitions': <String, Object?>{
    'approvalSource': <String, Object?>{
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
  },
  'x-firestore-collection': 'organizerCommunityMemberships',
  'x-firestore-path': 'organizerCommunityMemberships/{membershipId}',
  'x-owner': 'decideOrganizerCommunityMembership',
};
