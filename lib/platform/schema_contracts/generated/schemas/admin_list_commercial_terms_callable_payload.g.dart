// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_commercial_terms_payload.schema.json.

const schemaAdminListCommercialTermsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_commercial_terms_payload.schema.json',
  'title': 'AdminListCommercialTermsCallablePayload',
  'description': 'Finance/Admin Owner read of commercial terms for the Admin console: the platform defaults, one scope\'s stored record and recent revisions (organizerId null for the platform), every organizer override, and an optional organizer name search for adding an override. Read-only; writes go through manageCommercialTerms.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Catch operators (Finance, Admin Owner)',
  'required': <Object?>[
    'organizerId',
    'organizerQuery',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'organizerQuery': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 2,
      'maxLength': 80,
    },
  },
};
