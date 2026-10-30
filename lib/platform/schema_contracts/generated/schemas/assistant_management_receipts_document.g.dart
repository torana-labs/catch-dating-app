// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/assistant_management_receipts.schema.json.

const schemaAssistantManagementReceiptsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/assistant_management_receipts.schema.json',
  'title': 'AssistantManagementReceiptDocument',
  'description': 'Immutable server-side result of one owner management request; keyed by issuer and request id hash.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'receiptId',
    'issuerUid',
    'requestId',
    'action',
    'targetId',
    'materialHash',
    'result',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'issuerUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'assistant.clients.set',
        'assistant.delegations.issue',
        'assistant.delegations.revoke',
      ],
    },
    'targetId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'materialHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'result': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'clientId': <String, Object?>{
          'type': 'string',
        },
        'authUid': <String, Object?>{
          'type': 'string',
        },
        'active': <String, Object?>{
          'type': 'boolean',
        },
        'delegationId': <String, Object?>{
          'type': 'string',
        },
        'actorUid': <String, Object?>{
          'type': 'string',
        },
        'allowedActions': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
          },
        },
        'organizerIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
          },
        },
        'fieldIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
          },
        },
        'expiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'revoked': <String, Object?>{
          'type': 'boolean',
        },
        'revokedByUid': <String, Object?>{
          'type': 'string',
        },
        'revokedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'issuedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'assistantManagementReceipts',
  'x-firestore-path': 'assistantManagementReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'sales assistant gateway server-only immutable management transaction',
};
