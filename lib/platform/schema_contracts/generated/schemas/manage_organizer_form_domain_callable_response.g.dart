// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_organizer_form_domain_response.schema.json.

const schemaManageOrganizerFormDomainCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_organizer_form_domain_response.schema.json',
  'title': 'ManageOrganizerFormDomainCallableResponse',
  'description': 'Manager-visible hostname state without a certificate operation or private form data.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'hostname',
    'status',
  ],
  'properties': <String, Object?>{
    'hostname': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 253,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'verified',
        'revoked',
      ],
    },
    'ownershipChallenge': <String, Object?>{
      'type': 'string',
      'pattern': '^catch-verification=[A-Za-z0-9_-]{32}\$',
    },
    'expectedCname': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 253,
    },
  },
};
