// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/send_cross_paths_invitation_payload.schema.json.

const schemaSendCrossPathsInvitationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/send_cross_paths_invitation_payload.schema.json',
  'title': 'SendCrossPathsInvitationCallablePayload',
  'description': 'Typed, message-free invitation intent accepted by sendCrossPathsInvitation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'recipientUid',
    'suggestionToken',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'recipientUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'suggestionToken': <String, Object?>{
      'type': 'string',
      'minLength': 40,
      'maxLength': 4096,
    },
  },
};
