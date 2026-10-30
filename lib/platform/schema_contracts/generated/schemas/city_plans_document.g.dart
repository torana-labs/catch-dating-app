// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/city_plans.schema.json.

const schemaCityPlansDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/city_plans.schema.json',
  'title': 'CityPlansDocument',
  'description': 'Read model holding what the website shows for one city, stored at cityPlans/{citySlug}: the plans starting in the next 14 days, how many there are of each format, the organisers behind them and whether the city is live or launching soon. Functions build it from the published organizer page read models (and, for cities that have not launched, from published organizers), so it adds no publication rule of its own. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'cityPlans',
  'x-firestore-path': 'cityPlans/{citySlug}',
  'x-document-id-field': 'citySlug',
  'x-catch-ownership': 'trigger-owned',
  'x-owner': 'functions/src/cityPlans: the organizer page trigger and the hourly rebuild. No client reads or writes.',
  'required': <Object?>[
    'schemaVersion',
    'citySlug',
    'cityLabel',
    'marketStatus',
    'status',
    'builtAt',
    'windowStart',
    'windowEnd',
    'planCount',
    'formatCounts',
    'plans',
    'organizers',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'citySlug': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z0-9]+(?:-[a-z0-9]+)*\$',
      'maxLength': 60,
    },
    'cityLabel': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'marketStatus': <String, Object?>{
      'type': 'string',
      'description': 'The market\'s launch status in functions/src/locations/marketConfig.ts.',
      'enum': <Object?>[
        'launched',
        'planned',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'description': 'live when the market has launched and has enough plans in the window to fill a page; otherwise launchingSoon, so a thin city never renders a sparse page.',
      'enum': <Object?>[
        'live',
        'launchingSoon',
      ],
    },
    'builtAt': <String, Object?>{
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
    'windowStart': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'description': 'When the build read its sources. Plans that ended before this are left out.',
    },
    'windowEnd': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'description': 'Fourteen days after windowStart. Plans starting at or after this are left out.',
    },
    'planCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'description': 'Every plan in the window, which may be more than plans holds.',
    },
    'formatCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Plans in the window by format.',
      'required': <Object?>[
        'run',
        'dinner',
        'games',
        'courts',
        'nightsOut',
        'other',
      ],
      'properties': <String, Object?>{
        'run': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'dinner': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'games': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'courts': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'nightsOut': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'other': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'plans': <String, Object?>{
      'type': 'array',
      'description': 'Plans in the window, soonest first.',
      'maxItems': 120,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'description': 'One plan as a city page lists it. Live booking terms are rechecked on its event page, never trusted from this snapshot.',
        'required': <Object?>[
          'source',
          'eventId',
          'path',
          'title',
          'format',
          'activityKind',
          'startTime',
          'endTime',
          'date',
          'location',
          'priceLabel',
          'photoUrl',
          'spotsLeft',
          'organizer',
        ],
        'properties': <String, Object?>{
          'source': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catch',
              'external',
            ],
          },
          'eventId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
          },
          'path': <String, Object?>{
            'type': 'string',
            'maxLength': 200,
            'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'format': <String, Object?>{
            'type': 'string',
            'description': 'The homepage format a plan\'s activity belongs to.',
            'enum': <Object?>[
              'run',
              'dinner',
              'games',
              'courts',
              'nightsOut',
              'other',
            ],
          },
          'activityKind': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'not': <String, Object?>{
              'const': 'singlesMixer',
            },
          },
          'startTime': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'endTime': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
          'date': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'location': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'priceLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'photoUrl': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 4096,
                'pattern': '^https://',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'spotsLeft': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'description': 'Places left on a Catch plan; null for an imported plan, which books on its source.',
          },
          'organizer': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'organizerId',
              'name',
              'path',
            ],
            'properties': <String, Object?>{
              'organizerId': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
              },
              'name': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
              'path': <String, Object?>{
                'type': 'string',
                'maxLength': 240,
                'pattern': '^/organizers/(?:[a-z0-9-]+/){1,2}\$',
              },
            },
          },
        },
      },
    },
    'organizers': <String, Object?>{
      'type': 'array',
      'description': 'Organisers in the city: those with a plan in the window first, soonest plan first, then by followers.',
      'maxItems': 24,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'name',
          'path',
          'category',
          'logo',
          'formats',
          'followerCount',
          'claimState',
          'upcomingPlanCount',
          'nextPlan',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'path': <String, Object?>{
            'description': 'The organiser page, or null while the city has not launched and the organiser has no public page yet.',
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'maxLength': 240,
                'pattern': '^/organizers/(?:[a-z0-9-]+/){1,2}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'category': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'logo': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'mode',
              'text',
              'status',
            ],
            'properties': <String, Object?>{
              'mode': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'monogram',
                ],
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
              'status': <String, Object?>{
                'type': 'string',
                'minLength': 1,
              },
            },
          },
          'formats': <String, Object?>{
            'type': 'array',
            'description': 'Formats the organiser runs, from its plans and its listed formats.',
            'maxItems': 6,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'description': 'The homepage format a plan\'s activity belongs to.',
              'enum': <Object?>[
                'run',
                'dinner',
                'games',
                'courts',
                'nightsOut',
                'other',
              ],
            },
          },
          'followerCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'claimState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'unclaimed',
              'claimPending',
              'claimed',
              'verified',
            ],
          },
          'upcomingPlanCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'description': 'The organiser\'s plans in the window.',
          },
          'nextPlan': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'eventId',
                  'path',
                  'title',
                  'startTime',
                  'date',
                ],
                'properties': <String, Object?>{
                  'eventId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
                  },
                  'path': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                    'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
                  },
                  'title': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                  'startTime': <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                  },
                  'date': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                  },
                },
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
  'definitions': <String, Object?>{
    'format': <String, Object?>{
      'type': 'string',
      'description': 'The homepage format a plan\'s activity belongs to.',
      'enum': <Object?>[
        'run',
        'dinner',
        'games',
        'courts',
        'nightsOut',
        'other',
      ],
    },
    'cityPlan': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'One plan as a city page lists it. Live booking terms are rechecked on its event page, never trusted from this snapshot.',
      'required': <Object?>[
        'source',
        'eventId',
        'path',
        'title',
        'format',
        'activityKind',
        'startTime',
        'endTime',
        'date',
        'location',
        'priceLabel',
        'photoUrl',
        'spotsLeft',
        'organizer',
      ],
      'properties': <String, Object?>{
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catch',
            'external',
          ],
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
        },
        'path': <String, Object?>{
          'type': 'string',
          'maxLength': 200,
          'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'format': <String, Object?>{
          'type': 'string',
          'description': 'The homepage format a plan\'s activity belongs to.',
          'enum': <Object?>[
            'run',
            'dinner',
            'games',
            'courts',
            'nightsOut',
            'other',
          ],
        },
        'activityKind': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'not': <String, Object?>{
            'const': 'singlesMixer',
          },
        },
        'startTime': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'endTime': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'date-time',
        },
        'date': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'location': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'priceLabel': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'photoUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 4096,
              'pattern': '^https://',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'spotsLeft': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'description': 'Places left on a Catch plan; null for an imported plan, which books on its source.',
        },
        'organizer': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerId',
            'name',
            'path',
          ],
          'properties': <String, Object?>{
            'organizerId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'path': <String, Object?>{
              'type': 'string',
              'maxLength': 240,
              'pattern': '^/organizers/(?:[a-z0-9-]+/){1,2}\$',
            },
          },
        },
      },
    },
    'cityOrganizer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'name',
        'path',
        'category',
        'logo',
        'formats',
        'followerCount',
        'claimState',
        'upcomingPlanCount',
        'nextPlan',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'path': <String, Object?>{
          'description': 'The organiser page, or null while the city has not launched and the organiser has no public page yet.',
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'maxLength': 240,
              'pattern': '^/organizers/(?:[a-z0-9-]+/){1,2}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'category': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'logo': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'text',
            'status',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'monogram',
              ],
            },
            'text': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
            },
          },
        },
        'formats': <String, Object?>{
          'type': 'array',
          'description': 'Formats the organiser runs, from its plans and its listed formats.',
          'maxItems': 6,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'description': 'The homepage format a plan\'s activity belongs to.',
            'enum': <Object?>[
              'run',
              'dinner',
              'games',
              'courts',
              'nightsOut',
              'other',
            ],
          },
        },
        'followerCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'claimState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unclaimed',
            'claimPending',
            'claimed',
            'verified',
          ],
        },
        'upcomingPlanCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'description': 'The organiser\'s plans in the window.',
        },
        'nextPlan': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'eventId',
                'path',
                'title',
                'startTime',
                'date',
              ],
              'properties': <String, Object?>{
                'eventId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
                },
                'path': <String, Object?>{
                  'type': 'string',
                  'maxLength': 200,
                  'pattern': '^/events/[A-Za-z0-9][A-Za-z0-9_-]{0,179}/\$',
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'startTime': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                },
                'date': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
              },
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
