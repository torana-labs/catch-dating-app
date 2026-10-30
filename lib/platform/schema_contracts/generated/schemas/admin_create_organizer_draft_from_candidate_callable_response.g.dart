// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_create_organizer_draft_from_candidate_response.schema.json.

const schemaAdminCreateOrganizerDraftFromCandidateCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_create_organizer_draft_from_candidate_response.schema.json',
  'title': 'AdminCreateOrganizerDraftFromCandidateCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'organizerPath',
    'curationPath',
    'created',
    'appVisibility',
    'ownershipState',
    'claimState',
    'publishStatus',
    'indexStatus',
    'crawlStatus',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 64,
    },
    'organizerPath': <String, Object?>{
      'type': 'string',
      'pattern': '^organizers/[^/]+\$',
    },
    'curationPath': <String, Object?>{
      'type': 'string',
      'pattern': '^organizerIntakeCurationDecisions/[^/]+\$',
    },
    'created': <String, Object?>{
      'type': 'boolean',
    },
    'appVisibility': <String, Object?>{
      'const': 'hidden',
    },
    'ownershipState': <String, Object?>{
      'const': 'programmatic',
    },
    'claimState': <String, Object?>{
      'const': 'unclaimed',
    },
    'publishStatus': <String, Object?>{
      'const': 'draft',
    },
    'indexStatus': <String, Object?>{
      'const': 'noindex',
    },
    'crawlStatus': <String, Object?>{
      'const': 'disabled',
    },
  },
};
