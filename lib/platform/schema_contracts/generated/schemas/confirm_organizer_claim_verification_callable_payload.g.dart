// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/confirm_organizer_claim_verification_payload.schema.json.

const schemaConfirmOrganizerClaimVerificationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/confirm_organizer_claim_verification_payload.schema.json',
  'title': 'ConfirmOrganizerClaimVerificationCallablePayload',
  'description': 'Callable payload accepted by confirmOrganizerClaimVerification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'attemptId',
  ],
  'properties': <String, Object?>{
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
