// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_supply_nominators_response.schema.json.

const schemaAdminListSupplyNominatorsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_supply_nominators_response.schema.json',
  'title': 'AdminListSupplyNominatorsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'nominators',
  ],
  'properties': <String, Object?>{
    'nominators': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'nominatorId',
          'channel',
          'phoneLast4',
          'role',
          'uid',
          'displayName',
          'defaultMarket',
          'active',
          'updatedAt',
        ],
        'properties': <String, Object?>{
          'nominatorId': <String, Object?>{
            'type': 'string',
            'pattern': '^whatsapp-[a-f0-9]{64}\$',
          },
          'channel': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'whatsapp',
            ],
          },
          'phoneLast4': <String, Object?>{
            'type': 'string',
            'pattern': '^[0-9]{4}\$',
          },
          'role': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'associate',
              'partner',
            ],
          },
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
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
          'updatedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
        },
      },
    },
  },
};
