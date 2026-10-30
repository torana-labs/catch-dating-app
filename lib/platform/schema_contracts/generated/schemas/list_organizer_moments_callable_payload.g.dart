// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_moments_payload.schema.json.

const schemaListOrganizerMomentsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_moments_payload.schema.json',
  'title': 'ListOrganizerMomentsCallablePayload',
  'description': 'List all moments for one event or program scope.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'scope',
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
  },
};
