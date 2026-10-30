// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/fetch_swipe_candidates_response.schema.json.

const schemaFetchSwipeCandidatesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/fetch_swipe_candidates_response.schema.json',
  'title': 'FetchSwipeCandidatesCallableResponse',
  'description': 'Roster-private post-event candidate response returned by fetchSwipeCandidates. Each profile is the persisted publicProfiles/{uid} document shape with uid injected at the wire boundary. Attendee-roster documents and rejected candidate identities are never returned. Cross Paths Explore consent remains a separate Phase 0 contract.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'profiles',
  ],
  'properties': <String, Object?>{
    'profiles': <String, Object?>{
      'type': 'array',
      'maxItems': 1000,
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
  },
};
