// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_rehearsal_movement_response.schema.json.

const schemaEventRehearsalMovementCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'organizerId',
    'clockId',
    'setupRevision',
    'runtimeRevision',
    'actorUid',
    'serverTime',
    'groupId',
    'groups',
    'progress',
    'roster',
    'selected',
    'checkpoint',
    'history',
    'nextBeforeRevision',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clockId': <String, Object?>{
      'type': 'string',
      'pattern': '^clock:[a-f0-9]{64}\$',
    },
    'setupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'runtimeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'serverTime': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'groups': <String, Object?>{
      'type': 'array',
      'maxItems': 41,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'groupId',
          'label',
        ],
        'properties': <String, Object?>{
          'groupId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
        },
      },
    },
    'progress': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'sourceHash',
        'eventOpen',
        'runtimeLive',
        'destinations',
        'current',
        'routeDecision',
        'guidance',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 500,
        },
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'eventOpen': <String, Object?>{
          'type': 'boolean',
        },
        'runtimeLive': <String, Object?>{
          'type': 'boolean',
        },
        'destinations': <String, Object?>{
          'type': 'array',
          'maxItems': 41,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'alternativeId',
              'target',
              'label',
              'text',
            ],
            'properties': <String, Object?>{
              'alternativeId': <String, Object?>{
                'type': 'string',
                'pattern': '^alternative:[a-f0-9]{64}\$',
              },
              'target': <String, Object?>{
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
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 4000,
              },
            },
          },
        },
        'current': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
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
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'routeDecision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'sessionId',
                'clockId',
                'groupId',
                'progressRevision',
                'previousRevision',
                'departureRevision',
                'sourceHash',
                'alternativeId',
                'destination',
                'decisionId',
                'operationId',
                'decidedBy',
                'decidedAt',
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
                  'minimum': 2,
                  'maximum': 500,
                },
                'previousRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 499,
                },
                'departureRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 499,
                },
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'alternativeId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^alternative:[a-f0-9]{64}\$',
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
                'decisionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'operationId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'decidedBy': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'decidedAt': <String, Object?>{
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
        'guidance': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'revision',
                'destination',
                'materialKey',
                'text',
                'validUntil',
              ],
              'properties': <String, Object?>{
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'Nonnegative safe integer revision.',
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
                'materialKey': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'text': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'validUntil': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                  'description': 'UTC milliseconds.',
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
    'roster': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceHash',
        'members',
        'unavailable',
        'coverage',
      ],
      'properties': <String, Object?>{
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
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
        'unavailable': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'reason',
            ],
            'properties': <String, Object?>{
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'reason': <String, Object?>{
                'enum': <Object?>[
                  'notCheckedIn',
                  'participationUnavailable',
                  'membershipUnavailable',
                  'invalidSource',
                ],
              },
            },
          },
        },
        'coverage': <String, Object?>{
          'const': 'boundedSession',
        },
      },
    },
    'checkpoint': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'progressRevision',
            'checkpointId',
            'sourceHash',
            'revision',
            'availability',
            'report',
            'request',
            'departure',
          ],
          'properties': <String, Object?>{
            'progressRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 500,
            },
            'checkpointId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'sourceHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'availability': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'rosterId',
                    'label',
                    'reportStatus',
                    'members',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'const': 'ready',
                    },
                    'rosterId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^departure-roster:[a-f0-9]{64}\$',
                    },
                    'label': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 240,
                    },
                    'reportStatus': <String, Object?>{
                      'enum': <Object?>[
                        'unreported',
                        'partial',
                        'complete',
                      ],
                    },
                    'members': <String, Object?>{
                      'type': 'array',
                      'maxItems': 1000,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'attendeeId',
                          'observation',
                          'visit',
                        ],
                        'properties': <String, Object?>{
                          'attendeeId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'observation': <String, Object?>{
                            'enum': <Object?>[
                              'accountedFor',
                              'unconfirmed',
                            ],
                          },
                          'visit': <String, Object?>{
                            'oneOf': <Object?>[
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'const': 'current',
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
                                      'registrationMissing',
                                      'visitChanged',
                                      'notCheckedIn',
                                      'invalidSource',
                                    ],
                                  },
                                },
                              },
                            ],
                          },
                          'disposition': <String, Object?>{
                            'description': 'Visit-bound event accountability evidence. A resolved disposition never means arrival at this checkpoint.',
                            'oneOf': <Object?>[
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                ],
                                'properties': <String, Object?>{
                                  'kind': <String, Object?>{
                                    'const': 'unresolved',
                                  },
                                },
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'kind',
                                  'disposition',
                                  'revision',
                                  'resolvedAt',
                                  'resolvedBy',
                                  'sourceHash',
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
                                    'maxLength': 2000,
                                  },
                                  'sourceHash': <String, Object?>{
                                    'type': 'string',
                                    'pattern': '^[a-f0-9]{64}\$',
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
                                      'registrationMissing',
                                      'visitChanged',
                                      'notCheckedIn',
                                      'invalidSource',
                                      'beforeDeparture',
                                    ],
                                  },
                                },
                              },
                            ],
                          },
                          'displayName': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'minLength': 1,
                            'maxLength': 120,
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
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'const': 'unavailable',
                    },
                    'reason': <String, Object?>{
                      'enum': <Object?>[
                        'rosterNotRecorded',
                        'destinationNotRecorded',
                        'differentCheckpoint',
                        'notCheckpoint',
                        'setupChanged',
                      ],
                    },
                  },
                },
              ],
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
            'request': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'responsibleOperatorId',
                        'dueAt',
                        'state',
                        'ownerAvailability',
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
                        'state': <String, Object?>{
                          'enum': <Object?>[
                            'awaitingReport',
                            'overdue',
                            'discrepancy',
                            'sourceUnavailable',
                          ],
                        },
                        'ownerAvailability': <String, Object?>{
                          'enum': <Object?>[
                            'current',
                            'needsReassignment',
                          ],
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'responsibleOperatorId',
                        'dueAt',
                        'state',
                        'ownerAvailability',
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
                        'state': <String, Object?>{
                          'enum': <Object?>[
                            'complete',
                            'closedOut',
                          ],
                        },
                        'ownerAvailability': <String, Object?>{
                          'const': 'notRequired',
                        },
                      },
                    },
                  ],
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
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
            'assignment': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'sourceHash',
                    'change',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'change': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
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
            'closeout': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'revision',
                    'sourceHash',
                    'change',
                    'state',
                    'eligibility',
                  ],
                  'properties': <String, Object?>{
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'change': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
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
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'state': <String, Object?>{
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
                                'reopened',
                                'closedOut',
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
                              'const': 'needsReview',
                            },
                            'reason': <String, Object?>{
                              'enum': <Object?>[
                                'sourceUnavailable',
                                'reportChanged',
                                'dispositionChanged',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'eligibility': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'ready',
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'reason',
                            'attendeeIds',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'const': 'unavailable',
                            },
                            'reason': <String, Object?>{
                              'enum': <Object?>[
                                'sourceUnavailable',
                                'reportMissing',
                                'reportComplete',
                                'unresolvedMembers',
                                'alreadyClosed',
                              ],
                            },
                            'attendeeIds': <String, Object?>{
                              'type': 'array',
                              'maxItems': 1000,
                              'uniqueItems': true,
                              'items': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 160,
                                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                              },
                            },
                          },
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
            'accountabilityReviews': <String, Object?>{
              'type': 'array',
              'maxItems': 50,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'attendeeId',
                  'visitHash',
                  'sourceHash',
                  'revision',
                  'disposition',
                  'availability',
                  'canResolve',
                ],
                'properties': <String, Object?>{
                  'attendeeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'visitHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'sourceHash': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{64}\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'disposition': <String, Object?>{
                    'enum': <Object?>[
                      'returned',
                      'departed',
                      'unresolved',
                    ],
                  },
                  'availability': <String, Object?>{
                    'oneOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'kind',
                        ],
                        'properties': <String, Object?>{
                          'kind': <String, Object?>{
                            'const': 'ready',
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
                              'notApplicable',
                              'notCheckedIn',
                              'departureNotRecorded',
                              'notOnDeparture',
                              'visitChanged',
                              'setupChanged',
                              'differentCheckpoint',
                              'destinationNotRecorded',
                              'notCheckpoint',
                            ],
                          },
                        },
                      },
                    ],
                  },
                  'canResolve': <String, Object?>{
                    'type': 'boolean',
                  },
                },
              },
            },
            'reporterOptions': <String, Object?>{
              'description': 'Current original-group reporter choices for the rehearsal manager.',
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'actorUid',
                    'sourceHash',
                    'validUntil',
                    'reporters',
                  ],
                  'properties': <String, Object?>{
                    'actorUid': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[^/]+\$',
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'validUntil': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'reporters': <String, Object?>{
                      'type': 'array',
                      'maxItems': 92,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'operatorId',
                          'displayName',
                          'validUntil',
                        ],
                        'properties': <String, Object?>{
                          'operatorId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 128,
                            'pattern': '^[^/]+\$',
                          },
                          'displayName': <String, Object?>{
                            'type': <Object?>[
                              'string',
                              'null',
                            ],
                            'minLength': 1,
                            'maxLength': 120,
                          },
                          'validUntil': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 9007199254740991,
                          },
                        },
                      },
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'history': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'progressRevision',
          'destination',
          'confirmedAt',
          'rosterSize',
          'reportRevision',
          'accountedForCount',
          'checkpointRequest',
        ],
        'properties': <String, Object?>{
          'progressRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 500,
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
          'rosterSize': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 50,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'reportRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'accountedForCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 50,
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
    },
    'nextBeforeRevision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 501,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'selected': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'staffReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clockId',
        'revision',
        'sourceHash',
        'hostUid',
        'actorUid',
        'practiceOperatorId',
        'serverTime',
        'canAssign',
        'operators',
        'groups',
      ],
      'properties': <String, Object?>{
        'clockId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'hostUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'practiceOperatorId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'serverTime': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'canAssign': <String, Object?>{
          'type': 'boolean',
        },
        'operators': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'operatorId',
              'displayName',
              'duties',
            ],
            'properties': <String, Object?>{
              'operatorId': <String, Object?>{
                'type': 'string',
                'pattern': '^practice-staff:[A-Za-z0-9_-]{1,60}\$',
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'duties': <String, Object?>{
                'type': 'array',
                'maxItems': 20,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'groupId',
                    'duty',
                    'expiresAtMillis',
                    'sourceHash',
                    'grantedBy',
                    'grantedAtMillis',
                  ],
                  'properties': <String, Object?>{
                    'groupId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'duty': <String, Object?>{
                      'enum': <Object?>[
                        'lead',
                        'pacer',
                        'sweep',
                      ],
                    },
                    'expiresAtMillis': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'grantedBy': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'grantedAtMillis': <String, Object?>{
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
        'groups': <String, Object?>{
          'type': 'array',
          'maxItems': 21,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'groupId',
              'label',
              'sourceHash',
              'permissions',
              'validUntil',
              'availableDuties',
            ],
            'properties': <String, Object?>{
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'permissions': <String, Object?>{
                'type': 'array',
                'maxItems': 5,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'readProgress',
                    'confirmDeparture',
                    'transferGroup',
                    'recordCheckpoint',
                    'resolveAccountability',
                  ],
                },
              },
              'validUntil': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'availableDuties': <String, Object?>{
                'type': 'array',
                'maxItems': 3,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'enum': <Object?>[
                    'lead',
                    'pacer',
                    'sweep',
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  'title': 'EventRehearsalMovementCallableResponse',
};
