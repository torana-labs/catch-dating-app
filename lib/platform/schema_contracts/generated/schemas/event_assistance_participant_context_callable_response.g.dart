// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_participant_context_response.schema.json.

const schemaEventAssistanceParticipantContextCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_assistance_participant_context_response.schema.json',
  'title': 'EventAssistanceParticipantContextCallableResponse',
  'description': 'Only the authenticated caller can resolve their own linked operational attendee. Ambiguity exposes no candidate identities and never selects a row.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'subjectUid',
    'serverTime',
    'resolution',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'subjectUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'serverTime': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'resolution': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'organizerId',
            'attendeeId',
            'sourceHash',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'linked',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'attendeeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'enum': <Object?>[
                'unlinked',
                'ambiguous',
              ],
            },
          },
        },
      ],
    },
  },
};
