// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/assistant_delegations.schema.json.

const schemaAssistantDelegationsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/assistant_delegations.schema.json',
  'title': 'AssistantDelegationDocument',
  'description': 'Private expiring action and entity grant from an employee to one registered assistant client.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'delegationId',
    'actorUid',
    'clientId',
    'allowedActions',
    'organizerIds',
    'fieldIds',
    'expiresAt',
    'maxRequestsPerMinute',
    'maxRequestsPerDay',
    'revoked',
    'revision',
    'issuedByUid',
    'issuedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'delegationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'clientId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'allowedActions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'hosts.search',
          'hosts.get',
          'tasks.list',
          'opportunities.list',
          'fields.list',
          'receipts.get',
          'activities.log',
          'tasks.upsert',
          'opportunities.upsert',
          'fields.create',
          'fields.setValue',
          'evidence.propose',
        ],
      },
    },
    'organizerIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 30,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[A-Za-z0-9_-]{3,128}\$',
      },
    },
    'fieldIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'maxLength': 96,
        'pattern': '^sales\\.[A-Za-z0-9._:-]+\$',
      },
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'maxRequestsPerMinute': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 60,
    },
    'maxRequestsPerDay': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
    },
    'revoked': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'issuedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'issuedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'revokedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'revokedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'assistantDelegations',
  'x-firestore-path': 'assistantDelegations/{delegationId}',
  'x-document-id-field': 'delegationId',
  'x-owner': 'sales assistant gateway server-only management',
};
