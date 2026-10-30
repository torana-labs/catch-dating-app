// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_fit_queue_list_request.schema.json.

const schemaAdminListSalesFitQueuePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_fit_queue_list_request.schema.json',
  'title': 'AdminListSalesFitQueuePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'view',
  ],
  'properties': <String, Object?>{
    'view': <String, Object?>{
      'enum': <Object?>[
        'ranked',
        'needs_research',
        'outreach_review_candidate',
      ],
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 25,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 600,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminListSalesFitQueue',
  ],
};
