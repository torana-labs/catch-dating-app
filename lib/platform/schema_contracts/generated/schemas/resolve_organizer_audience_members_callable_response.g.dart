// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/resolve_organizer_audience_members_response.schema.json.

const schemaResolveOrganizerAudienceMembersCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/resolve_organizer_audience_members_response.schema.json',
  'title': 'ResolveOrganizerAudienceMembersCallableResponse',
  'description': 'Bounded static selection labels and canonical contact links; unavailable contacts expose no identity.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'members',
  ],
  'properties': <String, Object?>{
    'members': <String, Object?>{
      'type': 'array',
      'maxItems': 2500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'selectedContactId',
          'contactId',
          'displayName',
          'available',
        ],
        'properties': <String, Object?>{
          'selectedContactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'contactId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'available': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
  },
};
