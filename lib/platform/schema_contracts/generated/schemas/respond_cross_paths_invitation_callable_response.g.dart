// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/respond_cross_paths_invitation_response.schema.json.

const schemaRespondCrossPathsInvitationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/respond_cross_paths_invitation_response.schema.json',
  'title': 'RespondCrossPathsInvitationCallableResponse',
  'description': 'Sanitized terminal response after accepting or declining an invitation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'invitationId',
    'status',
    'conversationId',
    'pairHoldId',
  ],
  'properties': <String, Object?>{
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accepted',
        'declined',
      ],
    },
    'conversationId': <String, Object?>{
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
    'pairHoldId': <String, Object?>{
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
  },
};
