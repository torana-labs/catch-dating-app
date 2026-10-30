// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/fetch_event_success_wingman_candidates_response.schema.json.

const schemaFetchEventSuccessWingmanCandidatesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/fetch_event_success_wingman_candidates_response.schema.json',
  'title': 'FetchEventSuccessWingmanCandidatesCallableResponse',
  'description': 'Callable response returned by fetchEventSuccessWingmanCandidates. Each profile is the persisted publicProfiles/{uid} document shape with `uid` injected at the wire boundary so clients can identify the profile owner. Per-field shape is enforced by PublicProfileDocument (contracts/firestore/public_profiles.schema.json) when the Dart side parses each entry.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'profiles',
  ],
  'properties': <String, Object?>{
    'profiles': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'x-wire-shape-extends': 'contracts/firestore/public_profiles.schema.json',
        'x-wire-shape-injects': <Object?>[
          'uid',
        ],
        'type': 'object',
        'required': <Object?>[
          'uid',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
      },
    },
    'candidates': <String, Object?>{
      'description': 'Runtime-safe candidate cards for no-download attendees. Existing app clients may continue using profiles.',
      'type': 'array',
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'gender',
          'source',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'gender': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'man',
              'woman',
              'nonBinary',
              'other',
              null,
            ],
          },
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchParticipation',
              'externalRuntime',
            ],
          },
        },
      },
    },
  },
};
