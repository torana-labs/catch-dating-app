// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_directory_summaries.schema.json.

const schemaHostDirectorySummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_directory_summaries.schema.json',
  'title': 'HostDirectorySummaryDocument',
  'description': 'Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostDirectorySummaries',
  'x-firestore-path': 'hostDirectorySummaries/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'Host read model projector',
  'required': <Object?>[
    'organizerId',
    'contactSummaryVersion',
    'segmentCounts',
    'summary',
    'manualTagVocabulary',
    'sourceCoverage',
    'projectionVersion',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'contactSummaryVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1,
      'x-catch-ownership': 'server-only',
    },
    'segmentCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
        'maximum': 9007199254740991,
      },
      'x-catch-ownership': 'server-only',
    },
    'summary': <String, Object?>{
      'title': 'GetOrganizerCrmSummaryCallableResponse',
      'description': 'Projected Host CRM counts. No attendee identity or contact field is returned.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'contactCount',
        'pastAttendeeCount',
        'repeatAttendeeCount',
        'advocateCount',
        'highImpactAdvocateCount',
        'linkedAccountCount',
        'importedContactCount',
        'whatsappOptInCount',
        'smsOptInCount',
        'truncated',
        'readiness',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'contactCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'pastAttendeeCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'repeatAttendeeCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'advocateCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'highImpactAdvocateCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'linkedAccountCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'importedContactCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'whatsappOptInCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'smsOptInCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 2147483647,
        },
        'truncated': <String, Object?>{
          'type': 'boolean',
        },
        'readiness': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'inApp',
            'whatsapp',
            'sms',
          ],
          'properties': <String, Object?>{
            'inApp': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'currentEventOnly',
              ],
            },
            'whatsapp': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'providerSetupRequired',
              ],
            },
            'sms': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'providerAndDltSetupRequired',
              ],
            },
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'manualTagVocabulary': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'tagId',
          'label',
        ],
        'properties': <String, Object?>{
          'tagId': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{32}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'sourceCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'partial',
      ],
      'x-catch-ownership': 'server-only',
    },
    'projectionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
      'x-catch-ownership': 'server-only',
    },
    'formSummaryVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1,
      'x-catch-ownership': 'server-only',
    },
    'eventSummaryVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1,
      'x-catch-ownership': 'server-only',
    },
    'groupSummaryVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1,
      'x-catch-ownership': 'server-only',
    },
    'responseSummaryVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1,
      'x-catch-ownership': 'server-only',
    },
  },
};
