// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_participant_activity_response.schema.json.

const schemaGetParticipantActivityCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_participant_activity_response.schema.json',
  'title': 'GetParticipantActivityCallableResponse',
  'description': 'Metadata only after exact account, response and immutable-version proof.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'item',
  ],
  'properties': <String, Object?>{
    'item': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceKind',
        'sourceId',
        'organizerId',
        'eventId',
        'formId',
        'versionId',
        'formTitle',
        'purpose',
        'submittedAtMillis',
      ],
      'properties': <String, Object?>{
        'sourceKind': <String, Object?>{
          'type': 'string',
          'const': 'formResponse',
        },
        'sourceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'versionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'formTitle': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
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
        'submittedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
