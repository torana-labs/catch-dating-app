// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_app_authorities.schema.json.

const schemaCatchWhatsappAppAuthorityDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_app_authorities.schema.json',
  'title': 'CatchWhatsappAppAuthorityDocument',
  'description': 'Server-only durable project/UID/incarnation-bound capability authority. Missing records deny; no TTL, bootstrap, raw endpoint or credential. Mutations require an audited full-span Auth fence.',
  'x-firestore-collection': 'catchWhatsappAppAuthorities',
  'x-firestore-path': 'catchWhatsappAppAuthorities/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'Catch support authority service',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'projectId',
    'uid',
    'revision',
    'incarnation',
    'state',
    'authNotBeforeSeconds',
    'updatedAtMillis',
    'capabilities',
    'endpointHash',
    'pending',
    'grantedBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'projectId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'incarnation': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'denied',
        'granting',
        'active',
      ],
    },
    'authNotBeforeSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'capabilities': <String, Object?>{
      'type': 'array',
      'maxItems': 3,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'review',
          'reply',
          'receive',
        ],
      },
    },
    'endpointHash': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'pending': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'nonce',
            'issuer',
            'capabilities',
            'endpointHash',
            'expiresAtMillis',
          ],
          'properties': <String, Object?>{
            'nonce': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'issuer': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'projectId',
                'uid',
                'revision',
                'incarnation',
                'capability',
                'endpointHash',
              ],
              'properties': <String, Object?>{
                'projectId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
                },
                'uid': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9_-]{1,128}\$',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'incarnation': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'capability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'review',
                    'reply',
                    'receive',
                  ],
                },
                'endpointHash': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
            'capabilities': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 3,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'review',
                  'reply',
                  'receive',
                ],
              },
            },
            'endpointHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'grantedBy': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'projectId',
            'uid',
            'revision',
            'incarnation',
            'capability',
            'endpointHash',
          ],
          'properties': <String, Object?>{
            'projectId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
            },
            'uid': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,128}\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'incarnation': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'capability': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'review',
                'reply',
                'receive',
              ],
            },
            'endpointHash': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'definitions': <String, Object?>{
    'binding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'projectId',
        'uid',
        'revision',
        'incarnation',
        'capability',
        'endpointHash',
      ],
      'properties': <String, Object?>{
        'projectId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
        },
        'uid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,128}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'incarnation': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'capability': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'review',
            'reply',
            'receive',
          ],
        },
        'endpointHash': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
};
