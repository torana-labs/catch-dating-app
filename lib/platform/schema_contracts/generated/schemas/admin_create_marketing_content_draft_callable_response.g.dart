// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_create_marketing_content_draft_response.schema.json.

const schemaAdminCreateMarketingContentDraftCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_create_marketing_content_draft_response.schema.json',
  'title': 'Admin Create Marketing Content Draft Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draft',
    'bridge',
    'dashboardPath',
  ],
  'properties': <String, Object?>{
    'draft': <String, Object?>{
      'type': 'object',
      'minProperties': 1,
      'additionalProperties': true,
    },
    'bridge': <String, Object?>{
      'type': 'object',
      'minProperties': 1,
      'additionalProperties': true,
    },
    'dashboardPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 260,
    },
  },
};
