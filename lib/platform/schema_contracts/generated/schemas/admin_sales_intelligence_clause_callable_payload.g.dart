// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_intelligence_clause_payload.schema.json.

const schemaAdminSalesIntelligenceClauseCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_intelligence_clause_payload.schema.json',
  'title': 'AdminSaveSalesIntelligenceClausePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'clauseId',
    'organizerId',
    'expectedRevision',
    'kind',
    'text',
    'evidenceIds',
    'validUntil',
    'permission',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
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
