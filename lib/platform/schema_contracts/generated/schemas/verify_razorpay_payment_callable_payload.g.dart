// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/verify_razorpay_payment_payload.schema.json.

const schemaVerifyRazorpayPaymentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/verify_razorpay_payment_payload.schema.json',
  'title': 'VerifyRazorpayPaymentCallablePayload',
  'description': 'Callable payload accepted by verifyRazorpayPayment.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'paymentId',
    'orderId',
    'signature',
  ],
  'properties': <String, Object?>{
    'paymentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'orderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'signature': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
  },
};
