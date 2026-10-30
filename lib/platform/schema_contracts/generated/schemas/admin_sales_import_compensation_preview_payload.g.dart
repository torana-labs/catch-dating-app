// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_import_compensation_preview_payload.schema.json.

const schemaAdminSalesImportCompensationPreviewPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_import_compensation_preview_payload.schema.json',
  'title': 'AdminSalesImportCompensationPreviewPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'importId',
    'organizerId',
  ],
  'properties': <String, Object?>{
    'importId': <String, Object?>{
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
  },
  'x-callable-aliases': <Object?>[
    'adminPreviewSalesImportCompensation',
  ],
};
