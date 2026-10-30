// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/user_analytics_response.schema.json.

const schemaUserAnalyticsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/user_analytics_response.schema.json',
  'title': 'UserAnalyticsCallableResponse',
  'description': 'User-safe profile and connection analytics response. Internal scoring columns stay in BigQuery and are intentionally not exposed here.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'generatedAt',
    'timezone',
    'range',
    'scope',
    'summaryCards',
    'trend',
    'connectionSummary',
    'profileSummary',
    'coachingTipRefs',
    'dataQuality',
  ],
  'properties': <String, Object?>{
    'generatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
    },
    'range': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'startDate',
        'endDate',
        'granularity',
      ],
      'properties': <String, Object?>{
        'startDate': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'endDate': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'granularity': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'day',
            'week',
            'month',
          ],
        },
        'preset': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 24,
        },
      },
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'userId',
      ],
      'properties': <String, Object?>{
        'userId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'summaryCards': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'value',
          'unit',
          'status',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'value': <String, Object?>{
            'type': 'number',
          },
          'unit': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'count',
              'percent',
              'duration_seconds',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ready',
              'partial',
              'missing',
            ],
          },
          'caption': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
        },
      },
    },
    'trend': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'periodStart',
          'periodEnd',
          'metrics',
        ],
        'properties': <String, Object?>{
          'periodStart': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'periodEnd': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'metrics': <String, Object?>{
            'type': 'object',
            'additionalProperties': <String, Object?>{
              'type': 'number',
            },
          },
        },
      },
    },
    'connectionSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'outgoingLikes',
        'incomingLikes',
        'privateInterestReceived',
        'mutualCatches',
        'chatsStarted',
        'chatMessagesSent',
        'followThroughRate',
        'eventsAttended',
      ],
      'properties': <String, Object?>{
        'outgoingLikes': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'incomingLikes': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'privateInterestReceived': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'mutualCatches': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'chatsStarted': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'chatMessagesSent': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'followThroughRate': <String, Object?>{
          'type': 'number',
          'minimum': 0,
        },
        'eventsAttended': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'profileSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'profileViews',
        'uniqueViewers',
        'profileDwellSeconds',
        'photoImpressions',
        'topPhotoId',
        'activeMinutes',
      ],
      'properties': <String, Object?>{
        'profileViews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'uniqueViewers': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'profileDwellSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'photoImpressions': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'topPhotoId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'activeMinutes': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'coachingTipRefs': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'copyKey',
          'priority',
          'metricIds',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'copyKey': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'priority': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 5,
          },
          'metricIds': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
          },
        },
      },
    },
    'dataQuality': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'state',
          'detail',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'state': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ok',
              'partial',
              'missing',
            ],
          },
          'detail': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'metricCard': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'label',
        'value',
        'unit',
        'status',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'value': <String, Object?>{
          'type': 'number',
        },
        'unit': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'count',
            'percent',
            'duration_seconds',
          ],
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ready',
            'partial',
            'missing',
          ],
        },
        'caption': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
      },
    },
  },
};
