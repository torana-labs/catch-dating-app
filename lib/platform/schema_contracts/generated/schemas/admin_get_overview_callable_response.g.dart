// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_get_overview_response.schema.json.

const schemaAdminGetOverviewCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_get_overview_response.schema.json',
  'title': 'Admin Get Overview Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'generatedAt',
    'timezone',
    'metrics',
    'queues',
    'dataQuality',
  ],
  'properties': <String, Object?>{
    'generatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'timezone': <String, Object?>{
      'const': 'UTC',
    },
    'metrics': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'value',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'value': <String, Object?>{
            'type': 'number',
          },
          'unit': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
        },
      },
    },
    'queues': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'safetyReports',
        'moderationFlags',
        'eventSafetyReports',
        'accessApplications',
        'clubClaimRequests',
        'clubIndexReviews',
        'paymentIssues',
      ],
      'properties': <String, Object?>{
        'safetyReports': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'moderationFlags': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'eventSafetyReports': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'accessApplications': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'clubClaimRequests': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'clubIndexReviews': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
            },
          },
        },
        'paymentIssues': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'title',
              'detail',
              'status',
              'createdAt',
              'targetPath',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'detail': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'createdAt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'targetPath': <String, Object?>{
                'type': 'string',
                'minLength': 3,
                'maxLength': 260,
              },
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
          'label',
          'state',
          'detail',
          'owner',
          'runbook',
          'nextAction',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'state': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ok',
              'warning',
              'blocked',
            ],
          },
          'detail': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
          'owner': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'runbook': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 260,
          },
          'nextAction': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 1000,
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'metric': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'label',
        'value',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'value': <String, Object?>{
          'type': 'number',
        },
        'unit': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
      },
    },
    'queue': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'title',
          'detail',
          'status',
          'createdAt',
          'targetPath',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'detail': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
          'status': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'createdAt': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'targetPath': <String, Object?>{
            'type': 'string',
            'minLength': 3,
            'maxLength': 260,
          },
        },
      },
    },
    'queueItem': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'title',
        'detail',
        'status',
        'createdAt',
        'targetPath',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'detail': <String, Object?>{
          'type': 'string',
          'maxLength': 1000,
        },
        'status': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'createdAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'targetPath': <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 260,
        },
      },
    },
    'dataQuality': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'label',
        'state',
        'detail',
        'owner',
        'runbook',
        'nextAction',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'state': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ok',
            'warning',
            'blocked',
          ],
        },
        'detail': <String, Object?>{
          'type': 'string',
          'maxLength': 1000,
        },
        'owner': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'runbook': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 260,
        },
        'nextAction': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
      },
    },
  },
};
