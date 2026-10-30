// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_reply_operations.schema.json.

const schemaCatchWhatsappReplyOperationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_reply_operations.schema.json',
  'title': 'CatchWhatsappReplyOperationDocument',
  'description': 'Private one-reply-per-inbound support claim and saved provider delivery projection. Explicit human review of the exact inbound support request is service evidence, never marketing permission. No body, credential or pricing data. No automatic retry or TTL; uncertain and completed claims remain consumed beyond receipt retention. Source-only and disabled pending atomic STOP ingress and scoped activation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'catchWhatsappReplyOperations',
  'x-firestore-path': 'catchWhatsappReplyOperations/{operationId}',
  'x-document-id-field': 'operationId',
  'x-owner': 'Catch support reply service',
  'required': <Object?>[
    'schemaVersion',
    'operationId',
    'purpose',
    'source',
    'wabaId',
    'phoneNumberId',
    'recipientUid',
    'endpointHash',
    'actorUid',
    'inboundEventId',
    'inboundMessageId',
    'inboundTextHash',
    'bodyHash',
    'materialHash',
    'reviewedAtMillis',
    'deadlineMillis',
    'state',
    'providerMessageId',
    'deliveryStatus',
    'deliveryEventId',
    'deliveryAtMillis',
    'createdAtMillis',
    'updatedAtMillis',
    'readinessEvidenceHash',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 72,
      'pattern': '^cwreply_[a-f0-9]{64}\$',
    },
    'purpose': <String, Object?>{
      'const': 'serviceSupport',
      'type': 'string',
    },
    'source': <String, Object?>{
      'const': 'reviewedInboundSupportRequest',
      'type': 'string',
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
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'inboundEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 69,
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'inboundMessageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^[^\\s\\u0000-\\u001f]+\$',
    },
    'inboundTextHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'bodyHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'materialHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'reviewedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'deadlineMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'claimed',
        'unknown',
        'completed',
      ],
      'type': 'string',
    },
    'providerMessageId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
          'pattern': '^[^\\s\\u0000-\\u001f]+\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'deliveryStatus': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed',
      ],
      'type': 'string',
    },
    'deliveryEventId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 69,
          'pattern': '^cwhe_[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'deliveryAtMillis': <String, Object?>{
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
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'readinessEvidenceHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'appAuthorityBindings': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'actor',
        'reviewer',
        'recipient',
      ],
      'properties': <String, Object?>{
        'actor': <String, Object?>{
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
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'state': <String, Object?>{
            'const': 'completed',
          },
        },
        'required': <Object?>[
          'state',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'providerMessageId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
            'pattern': '^[^\\s\\u0000-\\u001f]+\$',
          },
          'deliveryStatus': <String, Object?>{
            'enum': <Object?>[
              'accepted',
              'sent',
              'delivered',
              'read',
              'failed',
            ],
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'providerMessageId': <String, Object?>{
            'type': 'null',
          },
          'deliveryStatus': <String, Object?>{
            'const': 'pending',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'deliveryStatus': <String, Object?>{
            'enum': <Object?>[
              'pending',
              'accepted',
            ],
          },
        },
        'required': <Object?>[
          'deliveryStatus',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'deliveryEventId': <String, Object?>{
            'type': 'null',
          },
          'deliveryAtMillis': <String, Object?>{
            'type': 'null',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'deliveryEventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 69,
            'pattern': '^cwhe_[a-f0-9]{64}\$',
          },
          'deliveryAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
  ],
};
