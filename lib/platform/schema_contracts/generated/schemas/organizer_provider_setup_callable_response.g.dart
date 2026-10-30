// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_provider_setup_response.schema.json.

const schemaOrganizerProviderSetupCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_provider_setup_response.schema.json',
  'title': 'OrganizerProviderSetupCallableResponse',
  'description': 'Safe provider capability catalog, organizer connections and event mapping projection.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'providers',
    'connections',
    'mapping',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'providers': <String, Object?>{
      'type': 'array',
      'minItems': 9,
      'maxItems': 9,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'provider',
          'displayName',
          'adapterClass',
          'availability',
          'importSupport',
          'connectionMethod',
          'capabilities',
          'requirement',
        ],
        'properties': <String, Object?>{
          'provider': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'generic',
              'luma',
              'eventbrite',
              'partiful',
              'posh',
              'bookmyshow',
              'district',
              'sortmyscene',
              'airbnb',
            ],
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'adapterClass': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'A',
              'C',
              'D',
              'E',
              'unclassified',
            ],
          },
          'availability': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'available',
              'exportOnly',
              'configurationRequired',
              'partnerAccessRequired',
              'sampleRequired',
              'manualOnly',
            ],
          },
          'importSupport': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'verified',
              'generic',
              'sampleRequired',
            ],
          },
          'connectionMethod': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'apiKey',
              'oauth',
              'partner',
              'none',
            ],
          },
          'capabilities': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'fileImport',
              'eventList',
              'rosterIdentity',
              'registrationStatus',
              'providerCheckIn',
              'orderAmount',
              'refundStatus',
              'referralCode',
              'webhooks',
              'writeBookings',
            ],
            'properties': <String, Object?>{
              'fileImport': <String, Object?>{
                'type': 'boolean',
              },
              'eventList': <String, Object?>{
                'type': 'boolean',
              },
              'rosterIdentity': <String, Object?>{
                'type': 'boolean',
              },
              'registrationStatus': <String, Object?>{
                'type': 'boolean',
              },
              'providerCheckIn': <String, Object?>{
                'type': 'boolean',
              },
              'orderAmount': <String, Object?>{
                'type': 'boolean',
              },
              'refundStatus': <String, Object?>{
                'type': 'boolean',
              },
              'referralCode': <String, Object?>{
                'type': 'boolean',
              },
              'webhooks': <String, Object?>{
                'type': 'boolean',
              },
              'writeBookings': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          'requirement': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
      },
    },
    'connections': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'connectionId',
          'provider',
          'status',
          'externalAccountId',
          'externalAccountName',
          'syncMode',
          'capabilities',
          'revision',
          'lastHealthSyncAtMillis',
          'lastSuccessfulSyncAtMillis',
        ],
        'properties': <String, Object?>{
          'connectionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'provider': <String, Object?>{
            'const': 'luma',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'active',
              'degraded',
              'credentialRevoked',
              'disconnected',
            ],
          },
          'externalAccountId': <String, Object?>{
            'type': 'string',
          },
          'externalAccountName': <String, Object?>{
            'type': 'string',
          },
          'syncMode': <String, Object?>{
            'const': 'manualPoll',
          },
          'capabilities': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'eventList',
              'rosterIdentity',
              'registrationStatus',
              'providerCheckIn',
              'orderAmount',
              'refundStatus',
              'referralCode',
              'webhooks',
              'writeBookings',
            ],
            'properties': <String, Object?>{
              'eventList': <String, Object?>{
                'type': 'boolean',
              },
              'rosterIdentity': <String, Object?>{
                'type': 'boolean',
              },
              'registrationStatus': <String, Object?>{
                'type': 'boolean',
              },
              'providerCheckIn': <String, Object?>{
                'type': 'boolean',
              },
              'orderAmount': <String, Object?>{
                'type': 'boolean',
              },
              'refundStatus': <String, Object?>{
                'type': 'boolean',
              },
              'referralCode': <String, Object?>{
                'type': 'boolean',
              },
              'webhooks': <String, Object?>{
                'type': 'boolean',
              },
              'writeBookings': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'lastHealthSyncAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
          },
          'lastSuccessfulSyncAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
          },
        },
      },
    },
    'mapping': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'mappingId',
        'connectionId',
        'provider',
        'externalEventId',
        'status',
        'fieldAuthority',
        'revision',
        'lastSyncAtMillis',
        'lastSuccessfulSyncAtMillis',
        'lastSyncStatus',
        'lastSyncRunId',
      ],
      'properties': <String, Object?>{
        'mappingId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'connectionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'provider': <String, Object?>{
          'const': 'luma',
        },
        'externalEventId': <String, Object?>{
          'type': 'string',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'paused',
            'disconnected',
          ],
        },
        'fieldAuthority': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'rosterIdentity',
            'registrationStatus',
            'checkIn',
            'orderAmount',
            'refundStatus',
            'referralCode',
          ],
          'properties': <String, Object?>{
            'rosterIdentity': <String, Object?>{
              'const': 'provider',
            },
            'registrationStatus': <String, Object?>{
              'const': 'provider',
            },
            'checkIn': <String, Object?>{
              'const': 'providerWhenPresent',
            },
            'orderAmount': <String, Object?>{
              'const': 'unavailable',
            },
            'refundStatus': <String, Object?>{
              'const': 'unavailable',
            },
            'referralCode': <String, Object?>{
              'const': 'unavailable',
            },
          },
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'lastSyncAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
        },
        'lastSuccessfulSyncAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
        },
        'lastSyncStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'never',
            'running',
            'completed',
            'partial',
            'failed',
          ],
        },
        'lastSyncRunId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
      },
    },
  },
};
