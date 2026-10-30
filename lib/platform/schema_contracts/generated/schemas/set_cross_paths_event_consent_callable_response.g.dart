// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/set_cross_paths_event_consent_response.schema.json.

const schemaSetCrossPathsEventConsentCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/set_cross_paths_event_consent_response.schema.json',
  'title': 'SetCrossPathsEventConsentCallableResponse',
  'description': 'Sanitized response returned by setCrossPathsEventConsent.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'enabled',
    'termsVersion',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
    'termsVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
  },
};
