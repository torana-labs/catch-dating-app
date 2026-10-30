// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_evidence_add_payload.schema.json.

const schemaAdminAddSalesEvidenceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_evidence_add_payload.schema.json',
  'title': 'Sales evidence.add callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'claimKey',
    'sourceType',
    'sourceRef',
    'observedAt',
    'confidence',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contactId': <String, Object?>{
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    },
    'validThrough': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date-time',
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
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'excerpt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
  },
};
