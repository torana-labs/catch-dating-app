// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_approve_organizer_listing_response.schema.json.

const schemaAdminApproveOrganizerListingCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_approve_organizer_listing_response.schema.json',
  'title': 'AdminApproveOrganizerListingCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'approvalId',
    'organizerId',
    'organizerPath',
    'created',
    'publishStatus',
    'indexStatus',
    'appVisibility',
    'claimState',
    'salesOwnerUid',
  ],
  'properties': <String, Object?>{
    'approvalId': <String, Object?>{
      'type': 'string',
      'pattern': '^listing-[a-f0-9]{40}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 64,
    },
    'organizerPath': <String, Object?>{
      'type': 'string',
      'pattern': '^organizers/[^/]+\$',
    },
    'created': <String, Object?>{
      'type': 'boolean',
      'description': 'False when this exact approval had already been applied.',
    },
    'publishStatus': <String, Object?>{
      'const': 'published',
    },
    'indexStatus': <String, Object?>{
      'const': 'noindex',
    },
    'appVisibility': <String, Object?>{
      'const': 'hidden',
    },
    'claimState': <String, Object?>{
      'const': 'unclaimed',
    },
    'salesOwnerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
  },
};
