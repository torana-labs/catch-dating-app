// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/claim_event_runtime_access_payload.schema.json.

const schemaClaimEventRuntimeAccessCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/claim_event_runtime_access_payload.schema.json',
  'title': 'ClaimEventRuntimeAccessCallablePayload',
  'description': 'Claims one operational attendee after Firebase phone verification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRuntimeId',
    'displayName',
    'runtimeTermsVersion',
  ],
  'properties': <String, Object?>{
    'publicRuntimeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'runtimeTermsVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'attendeeToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 20,
      'maxLength': 240,
    },
    'inviteToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Legacy invite-link id or versioned opaque invitation bearer token.',
    },
  },
};
