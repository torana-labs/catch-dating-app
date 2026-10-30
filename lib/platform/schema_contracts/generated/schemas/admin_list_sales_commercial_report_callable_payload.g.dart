// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_sales_commercial_report_payload.schema.json.

const schemaAdminListSalesCommercialReportCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_sales_commercial_report_payload.schema.json',
  'title': 'commercial.report request',
  'description': 'Strict bounded private Sales commercial read.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 25,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
  },
};
