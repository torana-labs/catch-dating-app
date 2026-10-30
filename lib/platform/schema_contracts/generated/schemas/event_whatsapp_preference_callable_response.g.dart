// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_whatsapp_preference_response.schema.json.

const schemaEventWhatsappPreferenceCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_whatsapp_preference_response.schema.json',
  'title': 'EventWhatsappPreferenceCallableResponse',
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
        'eventId',
        'attendeeId',
        'serverTime',
        'revision',
        'preference',
        'canEnable',
        'availability',
        'phoneLastFour',
        'expiresAt',
        'consent',
        'senderId',
        'sender',
        'stopRecordHash',
        'reviewHash',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
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
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'revision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
          ],
        },
        'preference': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notSet',
            'enabled',
            'disabled',
            'expired',
          ],
        },
        'canEnable': <String, Object?>{
          'type': 'boolean',
        },
        'availability': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ready',
            'senderUnavailable',
            'eventClosed',
            'notAdmitted',
            'verifyPhone',
          ],
        },
        'phoneLastFour': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{4}\$',
            },
          ],
        },
        'expiresAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          ],
        },
        'consent': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'version',
            'text',
          ],
          'properties': <String, Object?>{
            'version': <String, Object?>{
              'type': 'string',
              'const': 'catch-event-service-whatsapp-v1',
            },
            'text': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
          },
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sender': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'displayName',
                'displayPhoneNumber',
                'bindingHash',
              ],
              'properties': <String, Object?>{
                'displayName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'displayPhoneNumber': <String, Object?>{
                  'type': 'string',
                  'minLength': 7,
                  'maxLength': 32,
                },
                'bindingHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          ],
        },
        'stopRecordHash': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          ],
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  },
};
