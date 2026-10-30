// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_sales_partner_preparation_payload.schema.json.

const schemaGetSalesPartnerPreparationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_sales_partner_preparation_payload.schema.json',
  'title': 'GetSalesPartnerPreparationCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'expectedAssignmentRevision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedAssignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
  },
  'x-callable-aliases': <Object?>[
    'getSalesPartnerPreparation',
  ],
};
