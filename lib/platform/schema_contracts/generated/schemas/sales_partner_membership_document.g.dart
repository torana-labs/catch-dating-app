// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_partner_memberships.schema.json.

const schemaSalesPartnerMembershipDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_partner_memberships.schema.json',
  'title': 'SalesPartnerMembershipDocument',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesPartnerMemberships',
  'x-firestore-path': 'salesPartnerMemberships/{id}',
  'x-document-id-field': 'uid',
  'x-owner': 'partner Sales scoped services',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'revision',
    'createdAt',
    'updatedAt',
    'uid',
    'status',
    'termsVersion',
    'acceptedAt',
    'expiresAt',
    'displayName',
    'marketingGrants',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'active',
        'revoked',
      ],
    },
    'termsVersion': <String, Object?>{
      'const': 'referral-preview-v1',
    },
    'acceptedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 100,
    },
    'marketingGrants': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'campaignId',
          'channel',
          'assetIds',
          'expiresAt',
          'schemaVersion',
          'grantId',
          'revision',
          'status',
          'organizerId',
          'assignmentRevision',
          'sourceHash',
          'reviewedAt',
          'reviewedBy',
          'reason',
          'purpose',
          'approvalReceiptId',
          'approvedMembershipRevision',
        ],
        'properties': <String, Object?>{
          'campaignId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
          'channel': <String, Object?>{
            'enum': <Object?>[
              'email',
              'whatsapp',
              'other',
            ],
          },
          'assetIds': <String, Object?>{
            'type': 'array',
            'maxItems': 12,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 128,
            },
            'minItems': 1,
          },
          'expiresAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'schemaVersion': <String, Object?>{
            'const': 1,
          },
          'grantId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'active',
              'revoked',
            ],
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
          'assignmentRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'sourceHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'reviewedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'reviewedBy': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
          'reason': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 1000,
          },
          'purpose': <String, Object?>{
            'const': 'manual_partner_outreach',
          },
          'approvalReceiptId': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'approvedMembershipRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
        },
        'description': 'Explicit employee-reviewed capability scope for exact approved Sales wording, a canonical organizer, campaign and channel. Source drift, changed assignment, expiry or revocation blocks preview. It grants no delivery, publication, event, guest, consent or provider authority.',
      },
    },
  },
};
