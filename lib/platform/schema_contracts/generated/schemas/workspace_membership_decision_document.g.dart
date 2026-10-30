// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/workspace_membership_decisions.schema.json.

const schemaWorkspaceMembershipDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/workspace_membership_decisions.schema.json',
  'title': 'WorkspaceMembershipDecisionDocument',
  'description': 'Immutable explicit membership selection, preserving previous evidence identity and reviewed guest revision. Canonical programGuests.groupIds remains membership truth, updated with this decision in one authorized transaction.',
  'x-firestore-collection': 'workspaceMembershipDecisions',
  'x-firestore-path': 'workspaceMembershipDecisions/{decisionId}',
  'x-document-id-field': 'decisionId',
  'x-owner': 'private program lodging server operations',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'programId',
    'workspaceRef',
    'relationshipRef',
    'groupId',
    'selectedAssertionId',
    'previousAssertionId',
    'relationshipRevision',
    'actorUid',
    'observedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'workspaceRef': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'id',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'program',
        },
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'relationshipRef': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'id',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'programGuest',
        },
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'selectedAssertionId': <String, Object?>{
      'type': 'string',
      'pattern': '^wma_[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'previousAssertionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^wma_[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'relationshipRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'observedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
