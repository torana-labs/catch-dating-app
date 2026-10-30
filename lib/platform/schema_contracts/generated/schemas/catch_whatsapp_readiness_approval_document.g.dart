// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_readiness_approval.schema.json.

const schemaCatchWhatsappReadinessApprovalDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_readiness_approval.schema.json',
  'title': 'CatchWhatsappReadinessApprovalDocument',
  'description': 'Server-only independently authorized review. Provisioning consumes it atomically with readiness and immutable audit; this source provides no approval writer. No TTL, token, endpoint or message body.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'approvalId',
    'state',
    'approval',
    'ingressEvidenceSha256',
    'consumedAtMillis',
    'recordSha256',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'approvalId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'minLength': 1,
      'maxLength': 128,
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved',
        'consumed',
      ],
    },
    'approval': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'approvalId',
        'action',
        'scope',
        'reviewerUid',
        'reviewedAtMillis',
        'expiresAtMillis',
        'atomicIngressStartedAtMillis',
        'expectedRecordSha256',
      ],
      'properties': <String, Object?>{
        'approvalId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          'minLength': 1,
          'maxLength': 128,
        },
        'action': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'create',
            'revoke',
          ],
        },
        'scope': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'projectId',
            'wabaId',
            'phoneNumberId',
            'recipientUid',
            'endpointHash',
            'evidenceSha256',
          ],
          'properties': <String, Object?>{
            'projectId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
              'minLength': 6,
              'maxLength': 30,
            },
            'wabaId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 32,
              'pattern': '^[0-9]{1,32}\$',
            },
            'phoneNumberId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 32,
              'pattern': '^[0-9]{1,32}\$',
            },
            'recipientUid': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
              'minLength': 1,
              'maxLength': 128,
            },
            'endpointHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
              'minLength': 64,
              'maxLength': 64,
            },
            'evidenceSha256': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
              'minLength': 64,
              'maxLength': 64,
            },
          },
        },
        'reviewerUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          'minLength': 1,
          'maxLength': 128,
        },
        'reviewedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'atomicIngressStartedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expectedRecordSha256': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
              'minLength': 64,
              'maxLength': 64,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'ingressEvidenceSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'minLength': 64,
      'maxLength': 64,
    },
    'consumedAtMillis': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'recordSha256': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
          'minLength': 64,
          'maxLength': 64,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'x-firestore-collection': 'catchWhatsappReadinessApprovals',
  'x-firestore-path': 'catchWhatsappReadinessApprovals/{approvalId}',
  'x-document-id-field': 'approvalId',
  'x-owner': 'Catch support readiness provisioning',
};
