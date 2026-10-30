// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/host_analytics_query_payload.schema.json.

const schemaHostAnalyticsQueryCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/host_analytics_query_payload.schema.json',
  'title': 'HostAnalyticsQueryCallablePayload',
  'description': 'Callable payload accepted by getHostAnalytics and adminGetHostAnalytics.',
  'x-callable-aliases': <Object?>[
    'getHostAnalytics',
    'adminGetHostAnalytics',
  ],
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'eventId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'rangePreset': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        '7d',
        '30d',
        '90d',
        '12m',
        'month',
        'custom',
      ],
    },
    'startDate': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
    },
    'endDate': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
    },
    'granularity': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'day',
        'week',
        'month',
      ],
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
    },
  },
};
