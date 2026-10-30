// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_participant_organizer_application_form_payload.schema.json.

const schemaGetParticipantOrganizerApplicationFormCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_participant_organizer_application_form_payload.schema.json',
  'title': 'GetParticipantOrganizerApplicationFormCallablePayload',
  'description': 'Loads one published organizer application form and private, review-required suggestions for the authenticated participant.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'targetKind',
    'targetId',
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
    'targetKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizer',
        'event',
        'campaign',
      ],
    },
    'targetId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
