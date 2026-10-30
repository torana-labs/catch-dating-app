// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/prepare_event_offer_invitation_response.schema.json.

const schemaPrepareEventOfferInvitationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/prepare_event_offer_invitation_response.schema.json',
  'title': 'PrepareEventOfferInvitationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'url',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'url': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'pattern': '^https://',
      'maxLength': 2048,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
