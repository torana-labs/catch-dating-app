// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_set_supply_nominator_response.schema.json.

const schemaAdminSetSupplyNominatorCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_set_supply_nominator_response.schema.json',
  'title': 'AdminSetSupplyNominatorCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'nominatorId',
    'created',
    'phoneLast4',
    'defaultMarket',
    'active',
  ],
  'properties': <String, Object?>{
    'nominatorId': <String, Object?>{
      'type': 'string',
      'pattern': '^whatsapp-[a-f0-9]{64}\$',
    },
    'created': <String, Object?>{
      'type': 'boolean',
    },
    'phoneLast4': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}\$',
    },
    'defaultMarket': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-z][a-z0-9-]{1,49}\$',
    },
    'active': <String, Object?>{
      'type': 'boolean',
    },
  },
};
