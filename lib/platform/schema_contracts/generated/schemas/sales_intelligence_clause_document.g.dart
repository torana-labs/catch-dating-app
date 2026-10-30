// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_intelligence_clauses.schema.json.

const schemaSalesIntelligenceClauseDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_intelligence_clauses.schema.json',
  'title': 'SalesIntelligenceClauseDocument',
  'description': 'Private exact prose approved for one organizer. Revoked or expired source and reference permission block future use.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesIntelligenceClauses',
  'x-firestore-path': 'salesIntelligenceClauses/{clauseId}',
  'x-document-id-field': 'clauseId',
  'x-owner': 'private Sales intelligence clause callable',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'clauseId',
    'organizerId',
    'revision',
    'kind',
    'text',
    'state',
    'evidenceIds',
    'validUntil',
    'permission',
    'reviewedAt',
    'reviewedBy',
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
    'clauseId': <String, Object?>{
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'kind': <String, Object?>{
      'enum': <Object?>[
        'observation',
        'capability',
        'reference',
        'cta',
      ],
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'draft',
        'approved',
        'withdrawn',
      ],
    },
    'evidenceIds': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 96,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'validUntil': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'permission': <String, Object?>{
      'enum': <Object?>[
        'not_required',
        'private_mention',
        'withdrawn',
      ],
    },
    'reviewedAt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'reviewedBy': <String, Object?>{
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
    },
    'updatedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'partnerCitations': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'evidenceId',
          'sourceHash',
        ],
        'properties': <String, Object?>{
          'evidenceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'sourceHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
