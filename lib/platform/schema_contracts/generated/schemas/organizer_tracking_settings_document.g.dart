// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_tracking_settings.schema.json.

const schemaOrganizerTrackingSettingsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_tracking_settings.schema.json',
  'title': 'OrganizerTrackingSettingsDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'revision',
    'metaPixelId',
    'googleMeasurementId',
    'enabled',
    'updatedByUid',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'metaPixelId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{5,20}\$',
    },
    'googleMeasurementId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^G-[A-Z0-9]{4,20}\$',
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
      'const': false,
    },
    'updatedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
