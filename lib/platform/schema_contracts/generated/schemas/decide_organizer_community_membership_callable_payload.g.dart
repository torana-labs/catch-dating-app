// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/decide_organizer_community_membership_payload.schema.json.

const schemaDecideOrganizerCommunityMembershipCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/decide_organizer_community_membership_payload.schema.json',
  'title': 'DecideOrganizerCommunityMembershipCallablePayload',
  'description': 'Explicit manager decision bound to an approved organizer-target native application and a reviewed membership revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'uid',
    'requestId',
    'action',
    'expectedRevision',
    'applicationId',
    'expectedApplicationRevision',
    'reason',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'grant',
        'revoke',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740989,
    },
    'applicationId': <String, Object?>{
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
    'expectedApplicationRevision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740990,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'grant',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'applicationId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'expectedApplicationRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740990,
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'applicationId': <String, Object?>{
            'type': 'null',
          },
          'expectedApplicationRevision': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
  ],
};
