// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_intents_list_payload.schema.json.

const schemaAdminListSalesInboundIntentsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_intents_list_payload.schema.json',
  'title': 'Sales intents.list callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[],
  'properties': <String, Object?>{
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'needs_identity_review',
        'linked',
        'dismissed',
      ],
    },
  },
};
