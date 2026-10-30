// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_form_templates_response.schema.json.

const schemaListOrganizerFormTemplatesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_form_templates_response.schema.json',
  'title': 'ListOrganizerFormTemplatesCallableResponse',
  'description': 'Versioned template summaries for the Host form gallery.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'templates',
  ],
  'properties': <String, Object?>{
    'templates': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'templateId',
          'version',
          'title',
          'description',
          'purpose',
          'identityPolicy',
          'sectionCount',
          'questionCount',
        ],
        'properties': <String, Object?>{
          'templateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'version': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'description': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
          'purpose': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'application',
              'registration',
              'intake',
              'waiver',
              'feedback',
              'survey',
            ],
          },
          'identityPolicy': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'anonymous',
              'emailVerified',
              'phoneVerified',
              'emailOrPhoneVerified',
              'catchAccount',
            ],
          },
          'sectionCount': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 40,
          },
          'questionCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 4000,
          },
        },
      },
    },
  },
};
