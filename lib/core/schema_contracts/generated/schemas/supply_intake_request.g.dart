// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/supply_intake_request.schema.json.

const schemaSupplyIntakeRequestSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/supply_intake_request.schema.json',
  'title': 'SupplyIntakeRequest',
  'description': 'One request to build an organizer listing and collect that organizer\'s events. Every front door (a sales associate or partner nomination, an organizer\'s own submission, or an Admin-started discovery run) creates one; Supply Intake gathers, reviews and stages the result for staff.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'requestId',
    'kind',
    'market',
    'seed',
    'submittedBy',
    'submittedAt',
    'origin',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}\$',
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'nomination',
        'self_submission',
        'discovery',
      ],
    },
    'market': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{1,49}\$',
    },
    'seed': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'name',
        'urls',
        'notes',
        'categories',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 160,
        },
        'urls': <String, Object?>{
          'type': 'array',
          'maxItems': 10,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 2000,
            'pattern': '^https?://',
          },
        },
        'notes': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 2000,
        },
        'categories': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-z][a-z0-9_]{0,59}\$',
          },
        },
      },
      'allOf': <Object?>[
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'name': <String, Object?>{
                'type': 'null',
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'urls': <String, Object?>{
                'minItems': 1,
              },
            },
          },
        },
      ],
    },
    'submittedBy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'role',
        'uid',
        'partnerId',
      ],
      'properties': <String, Object?>{
        'role': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'associate',
            'partner',
            'organizer',
            'system',
          ],
        },
        'uid': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 128,
        },
        'partnerId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 128,
        },
      },
    },
    'submittedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'origin': <String, Object?>{
      'description': 'What created the request: an Admin nomination, a sales inbound intent (a website host application or a partner nomination), or a discovery run. Null for requests made by hand.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'id',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'admin_nomination',
                'sales_inbound_intent',
                'discovery_run',
              ],
            },
            'id': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
            },
          },
        },
      ],
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'const': 'discovery',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'role': <String, Object?>{
                'const': 'system',
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'const': 'self_submission',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'role': <String, Object?>{
                'const': 'organizer',
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'const': 'nomination',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'role': <String, Object?>{
                'enum': <Object?>[
                  'associate',
                  'partner',
                ],
              },
              'uid': <String, Object?>{
                'type': 'string',
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'role': <String, Object?>{
                'const': 'partner',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'partnerId': <String, Object?>{
                'type': 'string',
              },
            },
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'submittedBy': <String, Object?>{
            'properties': <String, Object?>{
              'partnerId': <String, Object?>{
                'type': 'null',
              },
            },
          },
        },
      },
    },
  ],
};
