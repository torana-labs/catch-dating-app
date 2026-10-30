// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/convert_organizer_form_response_response.schema.json.

const schemaConvertOrganizerFormResponseCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/convert_organizer_form_response_response.schema.json',
  'title': 'ConvertOrganizerFormResponseCallableResponse',
  'description': 'Completed reviewed conversion receipt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'organizerId',
    'formId',
    'responseId',
    'kind',
    'status',
    'fields',
    'resultId',
    'undoStatus',
    'completedAtMillis',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
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
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'crmContact',
        'application',
        'eventAttendeeProposal',
        'followUp',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'completed',
        'failed',
      ],
    },
    'fields': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'destinationField',
          'label',
          'value',
          'origin',
          'conflict',
        ],
        'properties': <String, Object?>{
          'destinationField': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'value': <String, Object?>{
            'type': <Object?>[
              'string',
              'number',
              'boolean',
              'null',
            ],
            'maxLength': 1000,
          },
          'origin': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'verifiedIdentity',
              'formAnswer',
              'hostOverride',
            ],
          },
          'conflict': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
    },
    'resultId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200,
    },
    'undoStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notAvailable',
        'available',
        'used',
        'expired',
      ],
    },
    'completedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
