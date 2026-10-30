// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/validate_organizer_form_draft_response.schema.json.

const schemaValidateOrganizerFormDraftCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/validate_organizer_form_draft_response.schema.json',
  'title': 'ValidateOrganizerFormDraftCallableResponse',
  'description': 'Publish-readiness result from the canonical form validator.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'valid',
    'issues',
  ],
  'properties': <String, Object?>{
    'valid': <String, Object?>{
      'type': 'boolean',
    },
    'issues': <String, Object?>{
      'type': 'array',
      'maxItems': 250,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'code',
          'path',
          'message',
          'severity',
        ],
        'properties': <String, Object?>{
          'code': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'path': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 300,
          },
          'message': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'severity': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'error',
              'warning',
            ],
          },
        },
      },
    },
  },
};
