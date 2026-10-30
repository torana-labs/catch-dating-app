// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_event_assignment_feature_choices_response.schema.json.

const schemaListEventAssignmentFeatureChoicesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_event_assignment_feature_choices_response.schema.json',
  'title': 'ListEventAssignmentFeatureChoicesCallableResponse',
  'description': 'Only the authenticated respondent\'s reviewed answer labels and purpose-specific decisions; old grants remain withdrawable after mapping/source changes.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'choices',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'choices': <String, Object?>{
      'type': 'array',
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'featureId',
          'responseId',
          'questionLabel',
          'answerLabel',
          'status',
          'revision',
          'canGrant',
        ],
        'properties': <String, Object?>{
          'featureId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'responseId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'questionLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 240,
          },
          'answerLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'notGranted',
              'granted',
              'withdrawn',
            ],
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'canGrant': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
  },
};
