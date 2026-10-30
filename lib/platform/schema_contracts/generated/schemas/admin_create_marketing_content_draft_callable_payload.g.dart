// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_create_marketing_content_draft_payload.schema.json.

const schemaAdminCreateMarketingContentDraftCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_create_marketing_content_draft_payload.schema.json',
  'title': 'Admin Create Marketing Content Draft Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftType',
  ],
  'properties': <String, Object?>{
    'draftType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'event_highlights',
        'feature_explainer',
      ],
    },
    'cityId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z0-9-]{2,60}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'weekStart': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceRecommendationSetId': <String, Object?>{
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
    'title': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 140,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
