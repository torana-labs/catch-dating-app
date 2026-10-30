// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_razorpay_order_payload.schema.json.

const schemaCreateRazorpayOrderCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_razorpay_order_payload.schema.json',
  'title': 'CreateRazorpayOrderCallablePayload',
  'description': 'Callable payload accepted by createRazorpayOrder. Returns a Razorpay order id + amount that the client uses to open the checkout sheet.',
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
      'minLength': 4,
      'maxLength': 64,
      'pattern': '^[A-Za-z0-9_-]+\$',
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
