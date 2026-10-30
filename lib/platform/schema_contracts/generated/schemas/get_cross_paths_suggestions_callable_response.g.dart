// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_cross_paths_suggestions_response.schema.json.

const schemaGetCrossPathsSuggestionsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_cross_paths_suggestions_response.schema.json',
  'title': 'GetCrossPathsSuggestionsCallableResponse',
  'description': 'Roster-private Cross Paths suggestions. The response contains only sanitized person and event projections plus a short-lived server-signed token.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'rankingVersion',
    'suggestions',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'rankingVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'suggestions': <String, Object?>{
      'type': 'array',
      'maxItems': 2,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'person',
          'event',
          'reasonCodes',
          'suggestionToken',
          'tokenExpiresAt',
        ],
        'properties': <String, Object?>{
          'person': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'uid',
              'name',
              'age',
              'gender',
              'city',
              'photoUrls',
              'promptAnswers',
              'relationshipGoal',
            ],
            'properties': <String, Object?>{
              'uid': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'name': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'age': <String, Object?>{
                'type': 'integer',
                'minimum': 18,
                'maximum': 99,
              },
              'gender': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'man',
                  'woman',
                  'nonBinary',
                  'other',
                ],
              },
              'city': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                    'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'photoUrls': <String, Object?>{
                'type': 'array',
                'minItems': 3,
                'maxItems': 6,
                'items': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                  'maxLength': 2048,
                },
              },
              'promptAnswers': <String, Object?>{
                'type': 'array',
                'minItems': 3,
                'maxItems': 3,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'prompt',
                    'answer',
                  ],
                  'properties': <String, Object?>{
                    'prompt': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 140,
                    },
                    'answer': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 300,
                    },
                  },
                },
              },
              'relationshipGoal': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
            },
          },
          'event': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'eventId',
              'organizerId',
              'startTime',
              'endTime',
              'meetingPoint',
              'activityKind',
              'photoUrl',
              'viewerBookingStatus',
              'pairHoldAvailable',
            ],
            'properties': <String, Object?>{
              'eventId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
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
              'startTime': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
              'endTime': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
              'meetingPoint': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'activityKind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'socialRun',
                  'running',
                  'walking',
                  'pickleball',
                  'padel',
                  'tennis',
                  'badminton',
                  'cycling',
                  'spinClass',
                  'yoga',
                  'strengthTraining',
                  'pubQuiz',
                  'barCrawl',
                  'dinner',
                  'singlesMixer',
                  'openActivity',
                ],
              },
              'photoUrl': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'format': 'uri',
                'maxLength': 2048,
              },
              'viewerBookingStatus': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'signedUp',
                  'canBookNow',
                ],
              },
              'pairHoldAvailable': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          'reasonCodes': <String, Object?>{
            'type': 'array',
            'minItems': 4,
            'maxItems': 5,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'attending_event',
                'viewer_attending',
                'booking_available',
                'mutual_preferences',
                'showcase_ready',
              ],
            },
          },
          'suggestionToken': <String, Object?>{
            'type': 'string',
            'minLength': 40,
            'maxLength': 4096,
          },
          'tokenExpiresAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'reasonCode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'attending_event',
        'viewer_attending',
        'booking_available',
        'mutual_preferences',
        'showcase_ready',
      ],
    },
    'promptAnswer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'prompt',
        'answer',
      ],
      'properties': <String, Object?>{
        'prompt': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 140,
        },
        'answer': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 300,
        },
      },
    },
    'person': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'name',
        'age',
        'gender',
        'city',
        'photoUrls',
        'promptAnswers',
        'relationshipGoal',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'age': <String, Object?>{
          'type': 'integer',
          'minimum': 18,
          'maximum': 99,
        },
        'gender': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'man',
            'woman',
            'nonBinary',
            'other',
          ],
        },
        'city': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
              'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'photoUrls': <String, Object?>{
          'type': 'array',
          'minItems': 3,
          'maxItems': 6,
          'items': <String, Object?>{
            'type': 'string',
            'format': 'uri',
            'maxLength': 2048,
          },
        },
        'promptAnswers': <String, Object?>{
          'type': 'array',
          'minItems': 3,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'prompt',
              'answer',
            ],
            'properties': <String, Object?>{
              'prompt': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
              'answer': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 300,
              },
            },
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
      },
    },
    'event': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'organizerId',
        'startTime',
        'endTime',
        'meetingPoint',
        'activityKind',
        'photoUrl',
        'viewerBookingStatus',
        'pairHoldAvailable',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
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
        'startTime': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'endTime': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'meetingPoint': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'activityKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'socialRun',
            'running',
            'walking',
            'pickleball',
            'padel',
            'tennis',
            'badminton',
            'cycling',
            'spinClass',
            'yoga',
            'strengthTraining',
            'pubQuiz',
            'barCrawl',
            'dinner',
            'singlesMixer',
            'openActivity',
          ],
        },
        'photoUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'maxLength': 2048,
        },
        'viewerBookingStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'signedUp',
            'canBookNow',
          ],
        },
        'pairHoldAvailable': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'suggestion': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'person',
        'event',
        'reasonCodes',
        'suggestionToken',
        'tokenExpiresAt',
      ],
      'properties': <String, Object?>{
        'person': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'uid',
            'name',
            'age',
            'gender',
            'city',
            'photoUrls',
            'promptAnswers',
            'relationshipGoal',
          ],
          'properties': <String, Object?>{
            'uid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'age': <String, Object?>{
              'type': 'integer',
              'minimum': 18,
              'maximum': 99,
            },
            'gender': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'man',
                'woman',
                'nonBinary',
                'other',
              ],
            },
            'city': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                  'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'photoUrls': <String, Object?>{
              'type': 'array',
              'minItems': 3,
              'maxItems': 6,
              'items': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 2048,
              },
            },
            'promptAnswers': <String, Object?>{
              'type': 'array',
              'minItems': 3,
              'maxItems': 3,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'prompt',
                  'answer',
                ],
                'properties': <String, Object?>{
                  'prompt': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 140,
                  },
                  'answer': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 300,
                  },
                },
              },
            },
            'relationshipGoal': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
          },
        },
        'event': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'organizerId',
            'startTime',
            'endTime',
            'meetingPoint',
            'activityKind',
            'photoUrl',
            'viewerBookingStatus',
            'pairHoldAvailable',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
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
            'startTime': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'endTime': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'meetingPoint': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
            },
            'activityKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'socialRun',
                'running',
                'walking',
                'pickleball',
                'padel',
                'tennis',
                'badminton',
                'cycling',
                'spinClass',
                'yoga',
                'strengthTraining',
                'pubQuiz',
                'barCrawl',
                'dinner',
                'singlesMixer',
                'openActivity',
              ],
            },
            'photoUrl': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'uri',
              'maxLength': 2048,
            },
            'viewerBookingStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'signedUp',
                'canBookNow',
              ],
            },
            'pairHoldAvailable': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
        'reasonCodes': <String, Object?>{
          'type': 'array',
          'minItems': 4,
          'maxItems': 5,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'attending_event',
              'viewer_attending',
              'booking_available',
              'mutual_preferences',
              'showcase_ready',
            ],
          },
        },
        'suggestionToken': <String, Object?>{
          'type': 'string',
          'minLength': 40,
          'maxLength': 4096,
        },
        'tokenExpiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
      },
    },
  },
};
