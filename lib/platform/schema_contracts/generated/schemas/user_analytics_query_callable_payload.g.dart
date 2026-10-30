// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/user_analytics_query_payload.schema.json.

const schemaUserAnalyticsQueryCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/user_analytics_query_payload.schema.json',
  'title': 'UserAnalyticsQueryCallablePayload',
  'description': 'Callable payload accepted by getUserAnalytics and adminGetUserAnalytics.',
  'x-callable-aliases': <Object?>[
    'getUserAnalytics',
    'adminGetUserAnalytics',
  ],
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'userId': <String, Object?>{
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
      'description': 'Admin-only user scope override. getUserAnalytics always scopes to the signed-in user.',
    },
    'rangePreset': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        '7d',
        '30d',
        '90d',
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
  },
};
