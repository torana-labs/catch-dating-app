// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/send_cross_paths_invitation_response.schema.json.

const schemaSendCrossPathsInvitationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/send_cross_paths_invitation_response.schema.json',
  'title': 'SendCrossPathsInvitationCallableResponse',
  'description': 'Sanitized invitation receipt returned after a successful send.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'invitationId',
    'status',
    'eventId',
    'recipientUid',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'const': 'pending',
    },
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
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
