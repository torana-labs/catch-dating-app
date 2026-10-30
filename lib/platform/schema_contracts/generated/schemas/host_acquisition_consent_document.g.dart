// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_acquisition_consents.schema.json.

const schemaHostAcquisitionConsentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_acquisition_consents.schema.json',
  'title': 'HostAcquisitionConsentDocument',
  'description': 'Private anonymous device permission, keyed by a domain-separated capability hash. Revocation tombstones cannot be reactivated; fresh permission requires a new capability.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostAcquisitionConsents',
  'x-firestore-path': 'hostAcquisitionConsents/{consentId}',
  'x-document-id-field': 'consentId',
  'x-owner': 'hostAcquisitionConsent and acquisition expiry worker',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'consentId',
    'status',
    'authority',
    'createdAt',
    'updatedAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'consentId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'active',
        'revoked',
      ],
    },
    'authority': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'version',
            'purpose',
            'analytics',
            'advertising',
            'chosenAt',
            'acceptedAt',
            'expiresAt',
            'revokedAt',
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
            'acceptedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'expiresAt': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'revokedAt': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'attributionCleanupPending': <String, Object?>{
      'description': 'Withdrawal tombstones only. True until the expiry worker drains every optional attribution snapshot bound to this consent; a revoked capability can never create another.',
      'type': 'boolean',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'const': 'revoked',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'attributionCleanupPending',
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'const': 'active',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'authority': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'version',
              'purpose',
              'analytics',
              'advertising',
              'chosenAt',
              'acceptedAt',
              'expiresAt',
              'revokedAt',
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
              'acceptedAt': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
              },
              'revokedAt': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 1,
              },
            },
          },
        },
      },
    },
  ],
};
