// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_set_club_index_status_payload.schema.json.

const schemaAdminSetClubIndexStatusCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_set_club_index_status_payload.schema.json',
  'title': 'AdminSetClubIndexStatusCallablePayload',
  'description': 'Callable payload accepted by adminSetClubIndexStatus.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'indexStatus',
    'checklist',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'indexStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'noindex',
        'indexReady',
        'indexed',
      ],
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceEvidenceVerified',
        'mediaRightsVerified',
        'cadenceVerified',
        'ownerContactVerified',
      ],
      'properties': <String, Object?>{
        'sourceEvidenceVerified': <String, Object?>{
          'type': 'boolean',
        },
        'mediaRightsVerified': <String, Object?>{
          'type': 'boolean',
        },
        'cadenceVerified': <String, Object?>{
          'type': 'boolean',
        },
        'ownerContactVerified': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
