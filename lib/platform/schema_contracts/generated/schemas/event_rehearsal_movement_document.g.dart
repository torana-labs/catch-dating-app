// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_movements.schema.json.

const schemaEventRehearsalMovementDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'clockId',
    'groupId',
    'progressRevision',
    'departure',
    'report',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clockId': <String, Object?>{
      'type': 'string',
      'pattern': '^clock:[a-f0-9]{64}\$',
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'progressRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 500,
    },
    'departure': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceHash',
        'destination',
        'confirmedAt',
        'confirmedBy',
        'operationId',
        'roster',
        'checkpointRequest',
      ],
      'properties': <String, Object?>{
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'confirmedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'confirmedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'roster': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'members',
                'selectionHash',
              ],
              'properties': <String, Object?>{
                'members': <String, Object?>{
                  'type': 'array',
                  'maxItems': 50,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'attendeeId',
                      'displayName',
                      'visitHash',
                      'episodeId',
                      'membershipHash',
                    ],
                    'properties': <String, Object?>{
                      'attendeeId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'displayName': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'visitHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'episodeId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'pattern': '^episode:[a-f0-9]{64}\$',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'membershipHash': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'pattern': '^[a-f0-9]{64}\$',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                },
                'selectionHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'checkpointRequest': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
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
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'report': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'rosterHash',
            'accountedFor',
            'reportedAt',
            'reportedBy',
            'correctionReason',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'rosterHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'accountedFor': <String, Object?>{
              'type': 'array',
              'maxItems': 50,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
            },
            'reportedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'reportedBy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'correctionReason': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                  'pattern': '\\S',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'assignment': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'operationId',
        'responsibleOperatorId',
        'previousResponsibleOperatorId',
        'assignedBy',
        'assignedAt',
        'reason',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'responsibleOperatorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
          'pattern': '^[^/]+\$',
        },
        'previousResponsibleOperatorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
          'pattern': '^[^/]+\$',
        },
        'assignedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
          'pattern': '^[^/]+\$',
        },
        'assignedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'reason': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
          'pattern': '\\S',
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'closeout': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'previousRevision',
        'operationId',
        'changedBy',
        'changedAt',
        'reason',
        'decision',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'previousRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'changedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
          'pattern': '^[^/]+\$',
        },
        'changedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'reason': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
          'pattern': '\\S',
        },
        'decision': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'report',
                'dispositions',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'close',
                },
                'report': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'rosterHash',
                    'accountedFor',
                    'reportedAt',
                    'reportedBy',
                    'correctionReason',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 9007199254740991,
                    },
                    'rosterHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'accountedFor': <String, Object?>{
                      'type': 'array',
                      'maxItems': 50,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                    },
                    'reportedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'reportedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'correctionReason': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                          'pattern': '\\S',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                  },
                },
                'dispositions': <String, Object?>{
                  'type': 'array',
                  'maxItems': 50,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'disposition',
                      'revision',
                      'resolvedAt',
                      'resolvedBy',
                      'sourceHash',
                      'attendeeId',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'resolved',
                      },
                      'disposition': <String, Object?>{
                        'enum': <Object?>[
                          'returned',
                          'departed',
                        ],
                      },
                      'revision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 9007199254740991,
                      },
                      'resolvedAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'resolvedBy': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 128,
                        'pattern': '^[^/]+\$',
                      },
                      'sourceHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'attendeeId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                    },
                  },
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'reopen',
                },
              },
            },
          ],
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  },
  'title': 'EventRehearsalMovementDocument',
  'description': 'An immutable synthetic departure manifest with a separately revised checkpoint observation.',
  'x-firestore-collection': 'eventRehearsalMovements',
  'x-firestore-path': 'eventRehearsalMovements/{movementId}',
  'x-document-id-field': 'id',
  'x-owner': 'event rehearsal callables',
};
