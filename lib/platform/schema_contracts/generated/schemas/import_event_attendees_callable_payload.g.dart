// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/import_event_attendees_payload.schema.json.

const schemaImportEventAttendeesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/import_event_attendees_payload.schema.json',
  'title': 'ImportEventAttendeesCallablePayload',
  'description': 'Callable payload accepted by importEventAttendees.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'importKey',
    'fileName',
    'format',
    'rows',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'importKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'fileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
        'manual',
      ],
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 250,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'displayName',
          'status',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'phone': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 40,
          },
          'email': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 320,
          },
          'cityMarketId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
                'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'externalReference': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'arrivalGroup': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'ticketType': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 120,
          },
          'revenueAmountMinor': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'revenueCurrency': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'pattern': '^[A-Z]{3}\$',
          },
          'revenueSource': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'hostImport',
              'hostEstimate',
              null,
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'invited',
              'registered',
              'waitlisted',
            ],
          },
        },
      },
    },
  },
};
