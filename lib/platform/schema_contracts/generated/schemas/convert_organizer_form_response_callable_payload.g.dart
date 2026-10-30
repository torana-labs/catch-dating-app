// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/convert_organizer_form_response_payload.schema.json.

const schemaConvertOrganizerFormResponseCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/convert_organizer_form_response_payload.schema.json',
  'title': 'ConvertOrganizerFormResponseCallablePayload',
  'description': 'Idempotently applies one reviewed response conversion.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'responseId',
    'kind',
    'eventId',
    'overrides',
    'requestId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
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
    'overrides': <String, Object?>{
      'type': 'object',
      'maxProperties': 20,
      'additionalProperties': <String, Object?>{
        'type': <Object?>[
          'string',
          'number',
          'boolean',
          'null',
        ],
      },
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
  },
};
