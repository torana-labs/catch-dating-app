// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_intelligence_score_snapshots.schema.json.

const schemaSalesIntelligenceScoreSnapshotDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_intelligence_score_snapshots.schema.json',
  'title': 'SalesIntelligenceScoreSnapshotDocument',
  'description': 'Immutable reviewed-source fit snapshot. Unknown or disputed factors yield a null score and unranked priority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesIntelligenceScoreSnapshots',
  'x-firestore-path': 'salesIntelligenceScoreSnapshots/{snapshotId}',
  'x-document-id-field': 'snapshotId',
  'x-owner': 'private Sales intelligence score callable',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'snapshotId',
    'organizerId',
    'accountRevision',
    'policyId',
    'policyRevision',
    'policyVersion',
    'sourceHash',
    'status',
    'score',
    'priority',
    'factors',
    'evaluatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'snapshotId': <String, Object?>{
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
    'accountRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'policyId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'policyRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'policyVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'complete',
        'needs_research',
        'review_required',
      ],
    },
    'score': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'maximum': 100,
    },
    'priority': <String, Object?>{
      'enum': <Object?>[
        'high',
        'medium',
        'low',
        'unranked',
      ],
    },
    'factors': <String, Object?>{
      'type': 'array',
      'minItems': 7,
      'maxItems': 7,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'factorId',
          'state',
          'value',
          'evidenceIds',
          'reason',
        ],
        'properties': <String, Object?>{
          'factorId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'state': <String, Object?>{
            'enum': <Object?>[
              'known',
              'unknown',
              'disputed',
            ],
          },
          'value': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 5,
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
          'reason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
        },
      },
    },
    'evaluatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'hash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
};
