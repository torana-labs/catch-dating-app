// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_contacts_upsert_payload.schema.json.

const schemaAdminUpsertSalesContactCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_contacts_upsert_payload.schema.json',
  'title': 'Sales contacts.upsert callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'expectedRevision',
    'contact',
    'relationship',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'linkExisting': <String, Object?>{
      'type': 'boolean',
    },
    'contact': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayName',
      ],
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
      },
    },
    'relationship': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'role',
        'decisionInfluence',
        'primary',
      ],
      'properties': <String, Object?>{
        'role': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'decisionInfluence': <String, Object?>{
          'enum': <Object?>[
            'unknown',
            'decision_maker',
            'influencer',
            'operator',
          ],
        },
        'primary': <String, Object?>{
          'type': 'boolean',
        },
        'endpoints': <String, Object?>{
          'type': 'array',
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'value',
              'verificationStatus',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'enum': <Object?>[
                  'email',
                  'phone',
                ],
              },
              'value': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 160,
              },
              'verificationStatus': <String, Object?>{
                'enum': <Object?>[
                  'unverified',
                  'verified',
                ],
              },
              'evidenceId': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 96,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
};
