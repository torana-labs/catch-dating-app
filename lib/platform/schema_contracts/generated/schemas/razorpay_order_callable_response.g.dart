// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/razorpay_order_response.schema.json.

const schemaRazorpayOrderCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/razorpay_order_response.schema.json',
  'title': 'RazorpayOrderCallableResponse',
  'description': 'Callable response returned by createRazorpayOrder.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'orderId',
    'amount',
    'currency',
    'keyId',
  ],
  'properties': <String, Object?>{
    'orderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'amount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100000000,
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
    },
    'keyId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Public Razorpay checkout key id from the same server environment that created the order. This is not the secret key.',
    },
  },
};
