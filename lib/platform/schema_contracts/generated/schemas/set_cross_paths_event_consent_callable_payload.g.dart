// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_cross_paths_event_consent_payload.schema.json.

const schemaSetCrossPathsEventConsentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_cross_paths_event_consent_payload.schema.json',
  'title': 'SetCrossPathsEventConsentCallablePayload',
  'description': 'Callable payload accepted by setCrossPathsEventConsent.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'enabled',
    'termsVersion',
    'source',
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
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'booking_success',
        'event_detail',
        'settings',
      ],
    },
  },
};
