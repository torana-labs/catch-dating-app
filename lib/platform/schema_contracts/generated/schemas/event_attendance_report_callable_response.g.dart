// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_attendance_report_response.schema.json.

const schemaEventAttendanceReportCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'view',
  ],
  'properties': <String, Object?>{
    'view': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'serverTime',
        'sourceHash',
        'closure',
        'source',
        'coverage',
        'rosterCount',
        'counts',
        'members',
      ],
      'properties': <String, Object?>{
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'closure': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'enum': <Object?>[
                    'open',
                    'cancelled',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'completedAt',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'runtimeComplete',
                },
                'completedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'endedAt',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'scheduledEnd',
                },
                'endedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          ],
        },
        'source': <String, Object?>{
          'const': 'eventAttendees',
        },
        'coverage': <String, Object?>{
          'enum': <Object?>[
            'emptyRoster',
            'completeRoster',
          ],
        },
        'rosterCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000,
        },
        'counts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'attended',
            'recordedNoShow',
            'unresolved',
            'notExpected',
          ],
          'properties': <String, Object?>{
            'attended': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000,
            },
            'recordedNoShow': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'hostConfirmed',
                'guestDeclined',
              ],
              'properties': <String, Object?>{
                'hostConfirmed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'guestDeclined': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
              },
            },
            'unresolved': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'unreviewed',
                'cleared',
                'sourceChanged',
                'superseded',
              ],
              'properties': <String, Object?>{
                'unreviewed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'cleared': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'sourceChanged': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'superseded': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
              },
            },
            'notExpected': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'invited',
                'waitlisted',
                'cancelled',
                'eventCancelled',
              ],
              'properties': <String, Object?>{
                'invited': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'waitlisted': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'cancelled': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
                'eventCancelled': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000,
                },
              },
            },
          },
        },
        'members': <String, Object?>{
          'type': 'array',
          'maxItems': 1000,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'classification',
            ],
            'properties': <String, Object?>{
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'classification': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'attended',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'evidence',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'recordedNoShow',
                      },
                      'evidence': <String, Object?>{
                        'enum': <Object?>[
                          'hostConfirmed',
                          'guestDeclined',
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'reason',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'unresolved',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'unreviewed',
                          'cleared',
                          'sourceChanged',
                          'superseded',
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'reason',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'notExpected',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'invited',
                          'waitlisted',
                          'cancelled',
                          'eventCancelled',
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  'title': 'EventAttendanceReportCallableResponse',
};
