// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/workspace_membership_assertions.schema.json.

const schemaWorkspaceMembershipAssertionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/workspace_membership_assertions.schema.json',
  'title': 'WorkspaceMembershipAssertionDocument',
  'description': 'Immutable source-labelled suggestion or manual membership evidence. Exact program/guest/group scope and program retention index are checked by the server. Import suggestions cannot overwrite selected manual inclusion or exclusion.',
  'x-firestore-collection': 'workspaceMembershipAssertions',
  'x-firestore-path': 'workspaceMembershipAssertions/{assertionId}',
  'x-document-id-field': 'assertionId',
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
    'included',
    'sourceKind',
    'sourceId',
    'sourceVersion',
    'sourceLabel',
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
    'included': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'sourceKind': <String, Object?>{
      'enum': <Object?>[
        'manualEntry',
        'manifestRow',
        'contributorList',
      ],
      'x-catch-ownership': 'server-only',
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'server-only',
    },
    'sourceVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'sourceLabel': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
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
