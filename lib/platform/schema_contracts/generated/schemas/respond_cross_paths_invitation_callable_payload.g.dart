// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/respond_cross_paths_invitation_payload.schema.json.

const schemaRespondCrossPathsInvitationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/respond_cross_paths_invitation_payload.schema.json',
  'title': 'RespondCrossPathsInvitationCallablePayload',
  'description': 'Recipient-only response accepted by respondCrossPathsInvitation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'invitationId',
    'decision',
  ],
  'properties': <String, Object?>{
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accept',
        'decline',
      ],
    },
  },
};
