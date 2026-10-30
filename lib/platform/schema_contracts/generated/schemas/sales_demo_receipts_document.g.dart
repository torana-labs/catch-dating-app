// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_receipts.schema.json.

const schemaSalesDemoReceiptsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_receipts.schema.json',
  'title': 'SalesDemoReceiptDocument',
  'description': 'Immutable issuer-bound command result and material hash; trial receipts expire with their session.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'receiptId',
    'actorUid',
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
    'actorUid': <String, Object?>{
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
        'salesDemo.blueprint.save',
        'salesDemo.blueprint.review',
        'salesDemo.blueprint.withdraw',
        'salesDemo.invitation.issue',
        'salesDemo.invitation.revoke',
        'salesDemo.session.start',
        'salesDemo.session.reviewApplication',
        'salesDemo.session.prepareReply',
        'salesDemo.session.admitGuest',
        'salesDemo.session.requestAssistance',
        'salesDemo.blueprint.partnerReview.share',
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
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'synthetic': <String, Object?>{
          'const': true,
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'blueprintRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'enum': <Object?>[
            'draft',
            'reviewed',
            'withdrawn',
          ],
        },
        'reviewedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'previewOnly': <String, Object?>{
          'type': 'boolean',
        },
        'expiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'revoked': <String, Object?>{
          'type': 'boolean',
        },
        'revokedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'revokedByUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'createdAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'active',
            'completed',
          ],
        },
        'allowedActions': <String, Object?>{
          'type': 'array',
          'maxItems': 4,
          'items': <String, Object?>{
            'enum': <Object?>[
              'reviewApplication',
              'prepareReply',
              'admitGuest',
              'requestAssistance',
            ],
          },
        },
        'actionCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 20,
        },
        'step': <String, Object?>{
          'enum': <Object?>[
            'application',
            'reply',
            'admission',
            'complete',
          ],
        },
        'application': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'applicantName',
            'request',
            'review',
          ],
          'properties': <String, Object?>{
            'applicantName': <String, Object?>{
              'const': 'Sample Applicant',
            },
            'request': <String, Object?>{
              'const': 'Sample event application',
            },
            'review': <String, Object?>{
              'enum': <Object?>[
                'pending',
                'approved',
                'needs_info',
              ],
            },
          },
        },
        'reply': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'template',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'enum': <Object?>[
                'none',
                'prepared',
              ],
            },
            'template': <String, Object?>{
              'enum': <Object?>[
                'none',
                'welcome',
                'clarify',
              ],
            },
          },
        },
        'guest': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'displayName',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'enum': <Object?>[
                'not_admitted',
                'admitted',
              ],
            },
            'displayName': <String, Object?>{
              'const': 'Sample Applicant',
            },
          },
        },
        'assistanceRequested': <String, Object?>{
          'type': 'boolean',
        },
        'sharingRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'sharingState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'withdrawn',
          ],
        },
        'previewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'sendAuthority': <String, Object?>{
          'const': false,
        },
        'capabilityApprovalAuthority': <String, Object?>{
          'const': false,
        },
        'organizerControlAuthority': <String, Object?>{
          'const': false,
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
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
  'x-firestore-collection': 'salesDemoReceipts',
  'x-firestore-path': 'salesDemoReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'sales demo transaction and bounded expiry worker',
};
