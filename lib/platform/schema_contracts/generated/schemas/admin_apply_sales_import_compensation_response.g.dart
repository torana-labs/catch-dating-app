// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_import_compensation_apply_response.schema.json.

const schemaAdminApplySalesImportCompensationResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_import_compensation_apply_response.schema.json',
  'title': 'AdminApplySalesImportCompensationResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'importId',
    'organizerId',
    'status',
    'receipt',
  ],
  'properties': <String, Object?>{
    'importId': <String, Object?>{
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
    'status': <String, Object?>{
      'enum': <Object?>[
        'compensated',
        'already_compensated',
      ],
    },
    'mode': <String, Object?>{
      'enum': <Object?>[
        'archive_companion',
        'remove_cohorts',
      ],
    },
    'cohortIdsRemoved': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'accountRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
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
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminApplySalesImportCompensation',
  ],
};
