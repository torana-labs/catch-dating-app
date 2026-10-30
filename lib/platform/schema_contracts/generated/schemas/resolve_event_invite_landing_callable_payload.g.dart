// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/resolve_event_invite_landing_payload.schema.json.

const schemaResolveEventInviteLandingCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/resolve_event_invite_landing_payload.schema.json',
  'title': 'ResolveEventInviteLandingCallablePayload',
  'description': 'Resolves an opaque invitation bearer token into one bounded event landing projection and records a deduplicated open.',
  'x-callable-aliases': <Object?>[
    'resolveEventInviteLanding',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'inviteToken',
  ],
  'properties': <String, Object?>{
    'inviteToken': <String, Object?>{
      'type': 'string',
      'pattern': '^v2_[A-Za-z0-9_-]{1,180}_[A-Za-z0-9_-]{43}\$',
      'maxLength': 230,
    },
    'sessionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 8,
      'maxLength': 128,
    },
  },
};
