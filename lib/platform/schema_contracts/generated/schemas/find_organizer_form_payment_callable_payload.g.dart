// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/find_organizer_form_payment_payload.schema.json.

const schemaFindOrganizerFormPaymentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/find_organizer_form_payment_payload.schema.json',
  'title': 'FindOrganizerFormPaymentCallablePayload',
  'description': 'Find the signed-in respondent\'s most recent payment for a public form without browser-local identifiers.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicFormId',
  ],
  'properties': <String, Object?>{
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
  },
};
