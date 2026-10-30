// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_organizer_form_asset_intent_response.schema.json.

const schemaCreateOrganizerFormAssetIntentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_organizer_form_asset_intent_response.schema.json',
  'title': 'CreateOrganizerFormAssetIntentCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'assetId',
    'uploadToken',
    'uploadUrl',
    'uploadFields',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'assetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uploadToken': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
    'uploadUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2000,
    },
    'uploadFields': <String, Object?>{
      'type': 'object',
      'maxProperties': 30,
      'additionalProperties': <String, Object?>{
        'type': 'string',
        'maxLength': 4000,
      },
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
