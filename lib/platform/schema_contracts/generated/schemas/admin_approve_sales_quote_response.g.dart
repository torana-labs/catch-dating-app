// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_approve_sales_quote_response.schema.json.

const schemaAdminApproveSalesQuoteResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_approve_sales_quote_response.schema.json',
  'title': 'admin_approve_sales_quote_response response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'quote',
    'decision',
    'receipt',
  ],
  'properties': <String, Object?>{
    'quote': <String, Object?>{
      'title': 'salesQuotes document',
      'description': 'Current quote head; accepted terms do not prove collection.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesQuotes',
      'x-firestore-path': 'salesQuotes/{quoteId}',
      'x-owner': 'private Sales commercial service',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'organizerId',
        'opportunityId',
        'quoteId',
        'revision',
        'termVersion',
        'status',
        'approvedDecisionId',
        'acceptedDecisionId',
        'updatedAt',
        'updatedBy',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'quoteId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'termVersion': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'draft',
            'approved',
            'accepted_reviewed',
          ],
        },
        'approvedDecisionId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'acceptedDecisionId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'updatedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'x-document-id-field': 'quoteId',
    },
    'decision': <String, Object?>{
      'title': 'salesCommercialDecisions document',
      'description': 'Append-only exact-version approval or reviewed terms acceptance; not a receipt.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesCommercialDecisions',
      'x-firestore-path': 'salesCommercialDecisions/{decisionId}',
      'x-owner': 'private Sales commercial service',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'decisionId',
        'organizerId',
        'opportunityId',
        'quoteId',
        'termVersion',
        'termsHash',
        'kind',
        'evidence',
        'approvedDecisionId',
        'actorUid',
        'decidedAt',
        'paymentStatus',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'decisionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'quoteId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'termVersion': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'termsHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'kind': <String, Object?>{
          'enum': <Object?>[
            'quote_approved',
            'terms_acceptance_reviewed',
          ],
        },
        'evidence': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'evidenceId',
            'sourceRef',
            'contentHash',
            'observedAt',
          ],
          'properties': <String, Object?>{
            'evidenceId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'sourceRef': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
            },
            'contentHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'observedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
          },
        },
        'approvedDecisionId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'decidedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'paymentStatus': <String, Object?>{
          'const': 'unknown',
        },
      },
      'x-document-id-field': 'decisionId',
    },
    'receipt': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'revision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
};
