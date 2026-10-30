// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_invitations.schema.json.

const schemaSalesDemoInvitationsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_invitations.schema.json',
  'title': 'SalesDemoInvitationDocument',
  'description': 'Private digest-only invitation. Contact endpoint is retained only as a keyed digest.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'invitationId',
    'blueprintId',
    'blueprintRevision',
    'tokenDigest',
    'contactBinding',
    'expiresAt',
    'revoked',
    'revision',
    'sessionCap',
    'sessionCount',
    'startReceiptCount',
    'startWindowMinute',
    'startWindowCount',
    'currentSessionId',
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
    'invitationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'tokenDigest': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'contactBinding': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'digest',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'enum': <Object?>[
                'email',
                'phone',
              ],
            },
            'digest': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      ],
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'revoked': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'sessionCap': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 3,
    },
    'sessionCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 3,
    },
    'startReceiptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 12,
    },
    'startWindowMinute': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'startWindowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 6,
    },
    'currentSessionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
      ],
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
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
  },
  'x-firestore-collection': 'salesDemoInvitations',
  'x-firestore-path': 'salesDemoInvitations/{invitationId}',
  'x-document-id-field': 'invitationId',
  'x-owner': 'sales demo admin and trial callables',
};
