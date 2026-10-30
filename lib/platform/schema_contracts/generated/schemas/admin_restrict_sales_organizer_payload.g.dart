// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_restrict_sales_organizer_payload.schema.json.

const schemaAdminRestrictSalesOrganizerPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_restrict_sales_organizer_payload.schema.json',
  'title': 'adminRestrictSalesOrganizerPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'reason',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminRestrictSalesOrganizer',
  ],
};
