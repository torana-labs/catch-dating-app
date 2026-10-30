// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from http/host_acquisition_consent_response.schema.json.

const schemaHostAcquisitionConsentHTTPResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/http/host_acquisition_consent_response.schema.json',
  'title': 'HostAcquisitionConsentHTTPResponse',
  'description': 'Permission handshake result. Disabled or revoked status never authorizes delivery.',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'ok',
        'status',
        'expiresAt',
      ],
      'properties': <String, Object?>{
        'ok': <String, Object?>{
          'const': true,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'active',
            'revoked',
            'disabled',
          ],
        },
        'expiresAt': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'error',
      ],
      'properties': <String, Object?>{
        'error': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 200,
        },
      },
    },
  ],
};
