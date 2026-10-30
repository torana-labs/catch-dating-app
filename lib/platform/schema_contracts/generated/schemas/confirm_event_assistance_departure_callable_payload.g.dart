// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/confirm_event_assistance_departure_payload.schema.json.

const schemaConfirmEventAssistanceDepartureCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'command',
    'expectedSourceHash',
  ],
  'properties': <String, Object?>{
    'command': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'context',
        'eventId',
        'operationId',
        'payload',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'confirmDeparture',
        },
        'context': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
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
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'rehearsalId',
                'virtualEventId',
                'clockId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'rehearsal',
                },
                'rehearsalId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'virtualEventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'clockId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
          ],
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'payload': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'groupId',
            'destination',
            'expectedProgressRevision',
          ],
          'properties': <String, Object?>{
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'destination': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'placeId',
                    'lateEntry',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'fixedPlace',
                    },
                    'placeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'lateEntry': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'allowed',
                        'hostDecision',
                        'closed',
                      ],
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'itineraryId',
                    'stopId',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'itineraryStop',
                    },
                    'itineraryId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'stopId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'routeId',
                    'groupId',
                    'checkpointId',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'groupCheckpoint',
                    },
                    'routeId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'checkpointId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                  },
                },
              ],
            },
            'expectedProgressRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'Nonnegative safe integer revision.',
            },
            'departureRoster': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'attendeeIds',
                'expectedSourceHash',
              ],
              'properties': <String, Object?>{
                'attendeeIds': <String, Object?>{
                  'type': 'array',
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'uniqueItems': true,
                  'maxItems': 1000,
                },
                'expectedSourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            'checkpointRequest': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'responsibleOperatorId',
                'dueAt',
              ],
              'properties': <String, Object?>{
                'responsibleOperatorId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[^/]+\$',
                },
                'dueAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
        },
      },
    },
    'expectedSourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'command': <String, Object?>{
          'properties': <String, Object?>{
            'context': <String, Object?>{
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'live',
                },
              },
            },
          },
        },
      },
    },
  ],
  'title': 'ConfirmEventAssistanceDepartureCallablePayload',
};
