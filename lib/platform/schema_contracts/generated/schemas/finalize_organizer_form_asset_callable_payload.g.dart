// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/finalize_organizer_form_asset_payload.schema.json.

const schemaFinalizeOrganizerFormAssetCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/finalize_organizer_form_asset_payload.schema.json',
  'title': 'FinalizeOrganizerFormAssetCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'draftToken',
    'assetId',
    'uploadToken',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'draftToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
    'assetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uploadToken': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
  },
};
