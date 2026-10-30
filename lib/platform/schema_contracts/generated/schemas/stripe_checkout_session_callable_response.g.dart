// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/stripe_checkout_session_response.schema.json.

const schemaStripeCheckoutSessionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/stripe_checkout_session_response.schema.json',
  'title': 'StripeCheckoutSessionCallableResponse',
  'description': 'Callable response returned by createStripeCheckoutSession.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'paymentId',
    'amountMinor',
    'currency',
    'checkoutUrl',
    'provider',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'paymentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'amountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100000000,
    },
    'currency': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 3,
    },
    'checkoutUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
    'provider': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'stripe',
      ],
    },
  },
};
