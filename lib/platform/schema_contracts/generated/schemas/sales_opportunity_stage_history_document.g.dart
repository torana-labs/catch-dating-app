// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_opportunity_stage_history.schema.json.

const schemaSalesOpportunityStageHistoryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_opportunity_stage_history.schema.json',
  'title': 'salesOpportunityStageHistory document',
  'description': 'Append-only private stage movement with explicit loss/reopen reason.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesOpportunityStageHistory',
  'x-firestore-path': 'salesOpportunityStageHistory/{historyId}',
  'x-owner': 'private Sales commercial service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'historyId',
    'organizerId',
    'opportunityId',
    'fromStage',
    'toStage',
    'reason',
    'actorUid',
    'changedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'historyId': <String, Object?>{
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
    'fromStage': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'toStage': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'reason': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
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
    'changedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
  },
  'x-document-id-field': 'historyId',
};
