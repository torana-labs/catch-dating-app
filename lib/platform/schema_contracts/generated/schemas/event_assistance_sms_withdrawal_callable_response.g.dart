// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_sms_withdrawal_response.schema.json.

const schemaEventAssistanceSmsWithdrawalCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_assistance_sms_withdrawal_response.schema.json',
  'title': 'EventAssistanceSmsWithdrawalCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'outcome',
    'view',
  ],
  'properties': <String, Object?>{
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'read',
        'applied',
        'replayed',
        'conflict',
      ],
    },
    'view': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'serverTime',
        'revision',
        'preference',
        'expiresAt',
      ],
      'properties': <String, Object?>{
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'preference': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'enabled',
            'disabled',
            'expired',
          ],
        },
        'expiresAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
