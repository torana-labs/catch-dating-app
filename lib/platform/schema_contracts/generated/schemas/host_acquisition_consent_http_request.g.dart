// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from http/host_acquisition_consent_request.schema.json.

const schemaHostAcquisitionConsentHTTPRequestSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/http/host_acquisition_consent_request.schema.json',
  'title': 'HostAcquisitionConsentHTTPRequest',
  'description': 'Anonymous device-specific grant or withdrawal. Capability is 32 random bytes and must never be logged. Old intake analytics is not this permission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'action',
    'capability',
  ],
  'properties': <String, Object?>{
    'action': <String, Object?>{
      'enum': <Object?>[
        'grant',
        'revoke',
      ],
    },
    'capability': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'choice': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'purpose',
        'analytics',
        'advertising',
        'chosenAt',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'const': 1,
        },
        'purpose': <String, Object?>{
          'const': 'host_acquisition_measurement',
        },
        'analytics': <String, Object?>{
          'const': true,
        },
        'advertising': <String, Object?>{
          'type': 'boolean',
        },
        'chosenAt': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'grant',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'choice',
        ],
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'choice': false,
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'choice': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'purpose',
        'analytics',
        'advertising',
        'chosenAt',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'const': 1,
        },
        'purpose': <String, Object?>{
          'const': 'host_acquisition_measurement',
        },
        'analytics': <String, Object?>{
          'const': true,
        },
        'advertising': <String, Object?>{
          'type': 'boolean',
        },
        'chosenAt': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
  },
};
