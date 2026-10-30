// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_sales_partner_workspace_payload.schema.json.

const schemaGetSalesPartnerWorkspaceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_sales_partner_workspace_payload.schema.json',
  'title': 'GetSalesPartnerWorkspaceCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[],
  'properties': <String, Object?>{
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 128,
    },
  },
  'x-callable-aliases': <Object?>[
    'getSalesPartnerWorkspace',
  ],
};
