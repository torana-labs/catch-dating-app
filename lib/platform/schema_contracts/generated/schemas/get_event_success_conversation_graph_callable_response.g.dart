// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_success_conversation_graph_response.schema.json.

const schemaGetEventSuccessConversationGraphCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_success_conversation_graph_response.schema.json',
  'title': 'GetEventSuccessConversationGraphCallableResponse',
  'description': 'Attendee-only end-of-event conversation graph form projection.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'consentMode',
    'prompt',
    'candidates',
    'selectedUids',
    'submissionStatus',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'consentMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'optIn',
        'optOut',
      ],
    },
    'prompt': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'candidates': <String, Object?>{
      'type': 'array',
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'assigned',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'assigned': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'selectedUids': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'submissionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unsubmitted',
        'submitted',
        'skipped',
      ],
    },
  },
};
