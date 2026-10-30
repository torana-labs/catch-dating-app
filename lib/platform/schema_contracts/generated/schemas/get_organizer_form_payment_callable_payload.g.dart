// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_organizer_form_payment_payload.schema.json.

const schemaGetOrganizerFormPaymentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_organizer_form_payment_payload.schema.json',
  'title': 'GetOrganizerFormPaymentCallablePayload',
  'description': 'Owner-only payment status or signed checkout callback; success still requires server capture verification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'paymentId',
    'callback',
  ],
  'properties': <String, Object?>{
    'paymentId': <String, Object?>{
      'type': 'string',
      'pattern': '^fp_[a-f0-9]{32}\$',
    },
    'callback': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'paymentId',
            'signature',
          ],
          'properties': <String, Object?>{
            'paymentId': <String, Object?>{
              'type': 'string',
              'pattern': '^pay_[A-Za-z0-9]+\$',
            },
            'signature': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-fA-F0-9]{64}\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
