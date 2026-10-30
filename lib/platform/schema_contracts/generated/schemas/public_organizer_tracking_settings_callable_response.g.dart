// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/public_organizer_tracking_settings_response.schema.json.

const schemaPublicOrganizerTrackingSettingsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/public_organizer_tracking_settings_response.schema.json',
  'title': 'PublicOrganizerTrackingSettingsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'enabled',
    'metaPixelId',
    'googleMeasurementId',
    'policyReason',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'metaPixelId': <String, Object?>{
      'type': 'null',
    },
    'googleMeasurementId': <String, Object?>{
      'type': 'null',
    },
    'policyReason': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'policyReviewRequired',
        'sensitiveEvent',
        'eventClassificationUnavailable',
      ],
    },
  },
};
