// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_decide_club_claim_payload.schema.json.

const schemaAdminDecideClubClaimCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_decide_club_claim_payload.schema.json',
  'title': 'AdminDecideClubClaimCallablePayload',
  'description': 'Callable payload accepted by adminDecideClubClaim.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'decision',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approve',
        'reject',
      ],
    },
    'decisionReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
