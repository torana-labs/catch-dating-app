// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/start_organizer_claim_verification_payload.schema.json.

const schemaStartOrganizerClaimVerificationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/start_organizer_claim_verification_payload.schema.json',
  'title': 'StartOrganizerClaimVerificationCallablePayload',
  'description': 'Callable payload accepted by startOrganizerClaimVerification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'method',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'method': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'instagramMessage',
        'lumaDescription',
      ],
    },
  },
};
