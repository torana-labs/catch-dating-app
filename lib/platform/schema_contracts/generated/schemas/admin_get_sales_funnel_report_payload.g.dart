// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_funnel_report.schema.json.

const schemaAdminGetSalesFunnelReportPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  'title': 'AdminGetSalesFunnelReportPayload',
  'x-callable-aliases': <Object?>[
    'adminGetSalesFunnelReport',
  ],
  'required': <Object?>[
    'since',
  ],
  'properties': <String, Object?>{
    'since': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  '\$id': 'https://catch.app/contracts/callables/admin_sales_funnel_report.schema.json',
};
