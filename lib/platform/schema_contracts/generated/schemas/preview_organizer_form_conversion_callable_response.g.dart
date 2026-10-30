// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/preview_organizer_form_conversion_response.schema.json.

const schemaPreviewOrganizerFormConversionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/preview_organizer_form_conversion_response.schema.json',
  'title': 'PreviewOrganizerFormConversionCallableResponse',
  'description': 'Exact reviewed fields, conflicts, and permission boundary before conversion.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'responseId',
    'kind',
    'eventId',
    'allowed',
    'fields',
    'warnings',
    'existingResultId',
  ],
  'properties': <String, Object?>{
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
    'allowed': <String, Object?>{
      'type': 'boolean',
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
    'warnings': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'string',
        'maxLength': 500,
      },
    },
    'existingResultId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200,
    },
  },
};
