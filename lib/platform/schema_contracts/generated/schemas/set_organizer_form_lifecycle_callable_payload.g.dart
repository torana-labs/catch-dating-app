// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_organizer_form_lifecycle_payload.schema.json.

const schemaSetOrganizerFormLifecycleCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_organizer_form_lifecycle_payload.schema.json',
  'title': 'SetOrganizerFormLifecycleCallablePayload',
  'description': 'Pauses, resumes, or archives one organizer form with an expected-state guard.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'expectedStatus',
    'action',
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
    'expectedStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'published',
        'paused',
        'archived',
      ],
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pause',
        'resume',
        'archive',
      ],
    },
  },
};
