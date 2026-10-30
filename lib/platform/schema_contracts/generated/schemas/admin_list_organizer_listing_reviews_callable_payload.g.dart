// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_organizer_listing_reviews_payload.schema.json.

const schemaAdminListOrganizerListingReviewsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_organizer_listing_reviews_payload.schema.json',
  'title': 'AdminListOrganizerListingReviewsCallablePayload',
  'description': 'One page of listings Supply Intake built that staff have not approved yet, newest first.',
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
      'maximum': 50,
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
    'adminListOrganizerListingReviews',
  ],
};
