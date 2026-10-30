// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_entitlements.schema.json.

const schemaOrganizerEntitlementsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_entitlements.schema.json',
  'title': 'OrganizerEntitlementsDocument',
  'description': 'Server-owned entitlement document at organizerEntitlements/{organizerId} holding purchased plan grants and metered usage. Written only by admin grant/revoke callables in the pilot; managers receive a bounded callable projection.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerEntitlements',
  'x-firestore-path': 'organizerEntitlements/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'organizer entitlement admin callables',
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'grants',
    'meters',
    'revision',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'grants': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'grantId',
          'sku',
          'unit',
          'quantityTotal',
          'quantityConsumed',
          'validFrom',
          'validUntil',
          'source',
          'receiptRef',
          'note',
          'grantedBy',
          'grantedAt',
          'revokedAt',
          'revokedBy',
          'revokeReason',
        ],
        'properties': <String, Object?>{
          'grantId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'operationContentHash': <String, Object?>{
            'type': 'string',
            'minLength': 16,
            'maxLength': 128,
            'description': 'Durable grant operation identity after the short-lived mutation receipt expires; absent only on legacy grants.',
          },
          'operationResultRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
            'description': 'Original grant result revision for exact replay after receipt expiry; absent only on legacy grants.',
          },
          'sku': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'wedding_essentials',
              'wedding_pro',
              'wedding_signature',
              'wedding_transport_addon',
              'planner_annual',
            ],
          },
          'unit': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'program',
              'organizerYear',
            ],
          },
          'quantityTotal': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'quantityConsumed': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'validFrom': <String, Object?>{
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
          'validUntil': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
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
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'manualInvoice',
              'checkout',
              'promo',
            ],
          },
          'receiptRef': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'note': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
          'grantedBy': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'grantedAt': <String, Object?>{
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
          'revokedAt': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
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
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'revokedBy': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'revokeReason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'meters': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'flightDaysUsed',
        'waConversationsUsed',
        'periodStartsAt',
      ],
      'properties': <String, Object?>{
        'flightDaysUsed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'waConversationsUsed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        'periodStartsAt': <String, Object?>{
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
      },
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
  },
};
