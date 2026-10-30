// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/import_program_manifest_payload.schema.json.

const schemaImportProgramManifestCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/import_program_manifest_payload.schema.json',
  'title': 'ImportProgramManifestCallablePayload',
  'description': 'Bulk manifest import for a program. Preview mode plans without writing; commit mode applies idempotently via clientOperationId. Rows describe one guest and, optionally, that guest\'s inbound travel leg.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'importProgramManifest',
    'importWeddingPhoneContacts',
  ],
  'required': <Object?>[
    'programId',
    'mode',
    'clientOperationId',
    'rows',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'preview',
        'commit',
      ],
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'displayName',
        ],
        'properties': <String, Object?>{
          'externalReference': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
            'description': 'Stable upstream id (CRM row id). Primary dedup key; without it, dedup falls back to displayName + flightNumber + arrival day.',
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'phoneE164': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 20,
          },
          'email': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 320,
          },
          'householdLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Matched against program households by case-insensitive label; unmatched labels create a household.',
          },
          'groupLabels': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 600,
            'description': 'Semicolon-separated program guest group memberships, at most 10 entries. Each entry is a label, or `dimension:label` where the first colon splits the dimension key; bare labels land on the `custom` dimension. Entries match programGuestGroups case-insensitively per dimension; unmatched entries create a group.',
          },
          'partyLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Ride-together travel party label; matched or created per program.',
          },
          'flightNumber': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z0-9]{2,3}-?[0-9]{1,4}[A-Z]?\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'originIata': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z]{3}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'destinationIata': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z]{3}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'scheduledArrivalAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 253402300799999,
          },
          'international': <String, Object?>{
            'type': <Object?>[
              'boolean',
              'null',
            ],
          },
          'pickupPointLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Must match an existing program pickup point label; unmatched values are row errors.',
          },
          'destinationHotelName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Must match an existing program hotel name; unmatched values are row errors.',
          },
          'destinationLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Free-text destination fallback when no program hotel applies.',
          },
          'passengers': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 20,
          },
          'luggageUnits': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 40,
          },
        },
      },
    },
  },
};
