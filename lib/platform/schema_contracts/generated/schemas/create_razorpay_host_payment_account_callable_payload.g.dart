// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_razorpay_host_payment_account_payload.schema.json.

const schemaCreateRazorpayHostPaymentAccountCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_razorpay_host_payment_account_payload.schema.json',
  'title': 'CreateRazorpayHostPaymentAccountCallablePayload',
  'description': 'Creates or continues an India host\'s Razorpay Route linked-account setup. Legal, stakeholder, and settlement details are sent to Razorpay and are never persisted in Catch Firestore.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'legalBusinessName',
    'businessType',
    'contactName',
    'email',
    'phone',
    'businessModel',
    'businessPan',
    'bankAccountNumber',
    'ifscCode',
    'beneficiaryName',
    'stakeholderName',
    'stakeholderEmail',
    'stakeholderPhone',
    'stakeholderPan',
    'stakeholderOwnershipPercent',
    'stakeholderIsDirector',
    'stakeholderIsExecutive',
    'termsAccepted',
  ],
  'properties': <String, Object?>{
    'legalBusinessName': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 200,
    },
    'businessType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'individual',
        'proprietorship',
        'partnership',
        'private_limited',
        'public_limited',
        'llp',
        'trust',
        'society',
        'ngo',
      ],
    },
    'contactName': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 255,
    },
    'email': <String, Object?>{
      'type': 'string',
      'format': 'email',
      'maxLength': 132,
    },
    'phone': <String, Object?>{
      'type': 'string',
      'pattern': '^[+]?[0-9]{8,15}\$',
    },
    'businessModel': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'businessPan': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{5}[0-9]{4}[A-Z]\$',
    },
    'bankAccountNumber': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,20}\$',
    },
    'ifscCode': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{4}0[A-Z0-9]{6}\$',
    },
    'beneficiaryName': <String, Object?>{
      'type': 'string',
      'minLength': 2,
      'maxLength': 120,
    },
    'stakeholderName': <String, Object?>{
      'type': 'string',
      'minLength': 2,
      'maxLength': 255,
    },
    'stakeholderEmail': <String, Object?>{
      'type': 'string',
      'format': 'email',
      'maxLength': 132,
    },
    'stakeholderPhone': <String, Object?>{
      'type': 'string',
      'pattern': '^[+]?[0-9]{8,15}\$',
    },
    'stakeholderPan': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{5}[0-9]{4}[A-Z]\$',
    },
    'stakeholderOwnershipPercent': <String, Object?>{
      'type': 'number',
      'minimum': 0,
      'maximum': 100,
    },
    'stakeholderIsDirector': <String, Object?>{
      'type': 'boolean',
    },
    'stakeholderIsExecutive': <String, Object?>{
      'type': 'boolean',
    },
    'termsAccepted': <String, Object?>{
      'type': 'boolean',
      'const': true,
    },
  },
};
