// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/finalize_organizer_form_asset_response.schema.json.

const schemaFinalizeOrganizerFormAssetCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/finalize_organizer_form_asset_response.schema.json',
  'title': 'FinalizeOrganizerFormAssetCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'assetId',
    'status',
    'sizeBytes',
  ],
  'properties': <String, Object?>{
    'assetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'ready',
      ],
    },
    'sizeBytes': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 26214400,
    },
  },
};
