// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/mutate_organizer_contact_merge_response.schema.json.

const schemaMutateOrganizerContactMergeCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/mutate_organizer_contact_merge_response.schema.json',
  'title': 'MutateOrganizerContactMergeCallableResponse',
  'description': 'Immutable organizer contact merge or reversal receipt projection.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'operation',
    'survivorContactId',
    'sourceContactId',
    'movedEdgeCount',
    'movedIdentityEvidenceCount',
    'movedClaimCount',
    'movedOriginCount',
    'replayed',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operation': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'merge',
        'unmerge',
      ],
    },
    'survivorContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'movedEdgeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedIdentityEvidenceCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedClaimCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedOriginCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
