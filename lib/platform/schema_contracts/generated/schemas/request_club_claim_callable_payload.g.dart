// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/request_club_claim_payload.schema.json.

const schemaRequestClubClaimCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/request_club_claim_payload.schema.json',
  'title': 'RequestClubClaimCallablePayload',
  'description': 'Callable payload accepted by requestClubClaim.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'requesterName',
    'requesterRole',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requesterName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'requesterRole': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'owner',
        'founder',
        'manager',
        'marketer',
        'venueManager',
        'other',
      ],
    },
    'businessEmail': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 320,
    },
    'businessPhone': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 32,
    },
    'proofUrls': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'string',
        'format': 'uri',
        'maxLength': 2048,
      },
      'uniqueItems': true,
    },
    'message': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
