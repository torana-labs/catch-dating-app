// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_stripe_checkout_session_payload.schema.json.

const schemaCreateStripeCheckoutSessionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_stripe_checkout_session_payload.schema.json',
  'title': 'CreateStripeCheckoutSessionCallablePayload',
  'description': 'Callable payload accepted by createStripeCheckoutSession. The server derives amount, currency, host account, and booking metadata from Firestore.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'crossPathsPairHoldId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
