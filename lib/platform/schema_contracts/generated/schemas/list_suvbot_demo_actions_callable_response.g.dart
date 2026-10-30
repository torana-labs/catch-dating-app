// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_suvbot_demo_actions_response.schema.json.

const schemaListSuvbotDemoActionsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_suvbot_demo_actions_response.schema.json',
  'title': 'ListSuvbotDemoActionsCallableResponse',
  'description': 'Callable response returned by listSuvbotDemoActions. Each action describes a button in the Suvbot demo-operations menu.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'actions',
  ],
  'properties': <String, Object?>{
    'actions': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'description',
          'icon',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'description': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'icon': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'destructive': <String, Object?>{
            'type': 'boolean',
          },
          'requiresText': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
  },
};
