// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/resolve_event_assistance_case_payload.schema.json.

const schemaResolveEventAssistanceCaseCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'command',
    'expectedSourceHash',
  ],
  'properties': <String, Object?>{
    'command': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'context',
        'eventId',
        'operationId',
        'payload',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'resolveAssistance',
        },
        'context': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'eventId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'live',
                },
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'rehearsalId',
                'virtualEventId',
                'clockId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'rehearsal',
                },
                'rehearsalId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'virtualEventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'clockId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
          ],
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'payload': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'caseId',
            'outcome',
            'owner',
            'expectedRevision',
          ],
          'properties': <String, Object?>{
            'caseId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'outcome': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'resolved',
                'declined',
                'transferred',
              ],
            },
            'owner': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              'description': 'Current organizer manager UID receiving a transferred request; otherwise the authenticated resolving manager UID.',
            },
            'expectedRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      },
    },
    'expectedSourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'command': <String, Object?>{
          'properties': <String, Object?>{
            'context': <String, Object?>{
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'live',
                },
              },
            },
          },
        },
      },
    },
  ],
  'title': 'ResolveEventAssistanceCaseCallablePayload',
};
