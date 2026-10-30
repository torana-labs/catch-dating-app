// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_evidence.schema.json.

const schemaSalesEvidenceDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_evidence.schema.json',
  'title': 'SalesEvidenceDocument',
  'description': 'Reviewed source lineage for Sales claims; not provider consent or ownership verification.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesEvidence',
  'x-firestore-path': 'salesEvidence/{evidenceId}',
  'x-owner': 'private Sales evidence service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'evidenceId',
    'organizerId',
    'contactId',
    'claimKey',
    'signalId',
    'sourceType',
    'sourceRef',
    'observedAt',
    'validThrough',
    'confidence',
    'normalizedValue',
    'excerpt',
    'reviewedAt',
    'reviewerUid',
    'createdAt',
    'createdBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'evidenceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contactId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'claimKey': <String, Object?>{
      'enum': <Object?>[
        'identity',
        'recurrence',
        'operation',
        'stack',
        'other',
      ],
    },
    'signalId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceType': <String, Object?>{
      'enum': <Object?>[
        'first_party',
        'public_web',
        'human_note',
        'import_artifact',
      ],
    },
    'sourceRef': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 320,
    },
    'observedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'validThrough': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'confidence': <String, Object?>{
      'enum': <Object?>[
        'high',
        'medium',
        'low',
      ],
    },
    'normalizedValue': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 500,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'excerpt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 500,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'reviewerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
  'x-document-id-field': 'evidenceId',
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'claimKey': <String, Object?>{
            'const': 'operation',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'signalId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
      },
    },
  ],
};
