// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_attendance_disposition_response.schema.json.

const schemaEventAttendanceDispositionCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'outcome',
    'operationRevision',
    'view',
  ],
  'properties': <String, Object?>{
    'outcome': <String, Object?>{
      'enum': <Object?>[
        'read',
        'applied',
        'replayed',
      ],
    },
    'operationRevision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'view': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'attendeeId',
        'displayName',
        'serverTime',
        'sourceHash',
        'attendance',
        'closure',
        'declineEvidence',
        'disposition',
        'recordability',
        'canClear',
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
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
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
        'attendance': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'checkedIn',
            'revision',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'enum': <Object?>[
                'invited',
                'registered',
                'waitlisted',
                'checkedIn',
                'cancelled',
              ],
            },
            'checkedIn': <String, Object?>{
              'type': 'boolean',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
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
        'declineEvidence': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'guestRevision',
                'episodeId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'guestDeclined',
                },
                'guestRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'episodeId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'disposition': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'revision',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'unreviewed',
                },
                'revision': <String, Object?>{
                  'const': 0,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'revision',
                'evidence',
                'actorUid',
                'recordedAt',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'recorded',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'evidence': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'hostConfirmed',
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'guestRevision',
                        'episodeId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'const': 'guestDeclined',
                        },
                        'guestRevision': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9007199254740991,
                        },
                        'episodeId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                      },
                    },
                  ],
                },
                'actorUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'recordedAt': <String, Object?>{
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
                'revision',
                'reason',
                'actorUid',
                'recordedAt',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'cleared',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'reason': <String, Object?>{
                  'enum': <Object?>[
                    'recordingMistake',
                    'attendanceCorrected',
                    'noLongerApplicable',
                  ],
                },
                'actorUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'recordedAt': <String, Object?>{
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
                'revision',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'sourceChanged',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'revision',
                'reason',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'superseded',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'reason': <String, Object?>{
                  'enum': <Object?>[
                    'attendanceChanged',
                    'eventChanged',
                    'guestIntentionChanged',
                  ],
                },
              },
            },
          ],
        },
        'recordability': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'allowed',
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
                  'const': 'unavailable',
                },
                'reason': <String, Object?>{
                  'enum': <Object?>[
                    'eventNotFinished',
                    'eventCancelled',
                    'notAdmitted',
                    'alreadyAttended',
                  ],
                },
              },
            },
          ],
        },
        'canClear': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  },
  'title': 'EventAttendanceDispositionCallableResponse',
};
