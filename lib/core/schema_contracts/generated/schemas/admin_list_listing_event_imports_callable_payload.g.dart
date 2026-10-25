// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_listing_event_imports_payload.schema.json.

const schemaAdminListListingEventImportsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_listing_event_imports_payload.schema.json',
  'title': 'AdminListListingEventImportsCallablePayload',
  'description': 'One page of approved Supply Intake listings, most recently approved first, each with the events it imported and where each stands: published (by the publication policy or staff), withdrawn, ready for staff, needing a resolution, or blocked.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'limit',
    'cursor',
  ],
  'properties': <String, Object?>{
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
    },
    'cursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 400,
          'pattern': '^[A-Za-z0-9_-]+\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'x-callable-aliases': <Object?>[
    'adminListListingEventImports',
  ],
};
