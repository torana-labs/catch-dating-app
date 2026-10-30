// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_import_compensation_preview_response.schema.json.

const schemaAdminPreviewSalesImportCompensationResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_import_compensation_preview_response.schema.json',
  'title': 'AdminPreviewSalesImportCompensationResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'mode',
    'blockers',
    'importId',
    'organizerId',
    'accountRevision',
    'cohortIdsRemoved',
    'previewHash',
    'alreadyCompensated',
  ],
  'properties': <String, Object?>{
    'mode': <String, Object?>{
      'enum': <Object?>[
        'archive_companion',
        'remove_cohorts',
        'blocked',
      ],
    },
    'blockers': <String, Object?>{
      'type': 'array',
      'maxItems': 32,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 96,
      },
    },
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
    'accountRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
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
    'previewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'alreadyCompensated': <String, Object?>{
      'type': 'boolean',
    },
  },
  'x-callable-aliases': <Object?>[
    'adminPreviewSalesImportCompensation',
  ],
};
