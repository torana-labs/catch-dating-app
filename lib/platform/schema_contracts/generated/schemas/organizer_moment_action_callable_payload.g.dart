// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/organizer_moment_action_payload.schema.json.

const schemaOrganizerMomentActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/organizer_moment_action_payload.schema.json',
  'title': 'OrganizerMomentActionCallablePayload',
  'description': 'Lifecycle transition on one moment: arm (approve the rule once), pause, or resume. Scope must match the stored moment.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'scope',
    'momentId',
  ],
  'properties': <String, Object?>{
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'event',
            'program',
            'organizer',
          ],
        },
        'eventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
          'description': 'Required when kind=event; must be null otherwise.',
        },
        'programId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
          'description': 'Required when kind=program; must be null otherwise.',
        },
        'organizerId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
          'description': 'Required when kind=organizer; must be null otherwise. Organizer scope hosts server-managed form-automation companion moments.',
        },
      },
    },
    'momentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
