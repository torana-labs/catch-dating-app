// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_reply_readiness.schema.json.

const schemaCatchWhatsappReplyReadinessDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_reply_readiness.schema.json',
  'title': 'CatchWhatsappReplyReadinessDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'readinessId',
    'wabaId',
    'phoneNumberId',
    'recipientUid',
    'endpointHash',
    'purpose',
    'state',
    'completeHistory',
    'historyFromMillis',
    'coveredThroughMillis',
    'atomicIngressStartedAtMillis',
    'evidenceSha256',
    'reviewedByUid',
    'reviewedAtMillis',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'readinessId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 72,
      'pattern': '^cwready_[a-f0-9]{64}\$',
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
      'minLength': 1,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'purpose': <String, Object?>{
      'type': 'string',
      'const': 'serviceSupport',
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'ready',
        'revoked',
      ],
    },
    'completeHistory': <String, Object?>{
      'type': 'boolean',
      'const': true,
    },
    'historyFromMillis': <String, Object?>{
      'type': 'integer',
      'const': 0,
    },
    'coveredThroughMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'atomicIngressStartedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'evidenceSha256': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
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
    'appAuthorityBindings': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'reviewer',
        'recipient',
      ],
      'properties': <String, Object?>{
        'reviewer': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'projectId',
            'uid',
            'revision',
            'incarnation',
            'capability',
            'endpointHash',
          ],
          'properties': <String, Object?>{
            'projectId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
            },
            'uid': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'incarnation': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'capability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'review',
                'reply',
                'receive',
              ],
            },
            'endpointHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        'recipient': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'projectId',
            'uid',
            'revision',
            'incarnation',
            'capability',
            'endpointHash',
          ],
          'properties': <String, Object?>{
            'projectId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
            },
            'uid': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'incarnation': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'capability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'review',
                'reply',
                'receive',
              ],
            },
            'endpointHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
      },
    },
  },
  'description': 'Private externally reviewed historical STOP clearance for one Catch sender/recipient endpoint. Complete evidence from sender inception (coverage starts at epoch) through verified atomic STOP ingress is required; empty or expired receipt queries are never proof. This feature only reads the record; it cannot attest, provision, refresh or activate it. No TTL or raw endpoint.',
  'x-firestore-collection': 'catchWhatsappReplyReadiness',
  'x-firestore-path': 'catchWhatsappReplyReadiness/{readinessId}',
  'x-document-id-field': 'readinessId',
  'x-owner': 'Catch support reply service',
};
