// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_assistance_checkpoint_response.schema.json.

const schemaEventAssistanceCheckpointCallableResponseSchema = <String, Object?>{
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
        'groupId',
        'checkpointId',
        'progressRevision',
        'serverTime',
        'sourceHash',
        'revision',
        'report',
        'availability',
        'request',
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
        'progressRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
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
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'report': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'schemaVersion',
                'reportId',
                'context',
                'groupId',
                'checkpointId',
                'progressRevision',
                'rosterId',
                'rosterHash',
                'revision',
                'accountedFor',
                'reportedBy',
                'reportedAt',
                'correctionReason',
                'createdAt',
              ],
              'properties': <String, Object?>{
                'schemaVersion': <String, Object?>{
                  'const': 1,
                },
                'reportId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^checkpoint:[a-f0-9]{64}\$',
                },
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
                'progressRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'rosterId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^departure-roster:[a-f0-9]{64}\$',
                },
                'rosterHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'accountedFor': <String, Object?>{
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
                'reportedBy': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'reportedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
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
                'createdAt': <String, Object?>{
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
        'assignment': <String, Object?>{
          'description': 'Present in current responses; null when no durable checkpoint request exists. Independent of the report revision.',
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
                        'receiptId',
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
                        'receiptId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^checkpoint-reassignment:[a-f0-9]{64}\$',
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
                        'receiptId',
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
                        'receiptId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^checkpoint-closeout:[a-f0-9]{64}\$',
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
                                    'schemaVersion',
                                    'reportId',
                                    'context',
                                    'groupId',
                                    'checkpointId',
                                    'progressRevision',
                                    'rosterId',
                                    'rosterHash',
                                    'revision',
                                    'accountedFor',
                                    'reportedBy',
                                    'reportedAt',
                                    'correctionReason',
                                    'createdAt',
                                  ],
                                  'properties': <String, Object?>{
                                    'schemaVersion': <String, Object?>{
                                      'const': 1,
                                    },
                                    'reportId': <String, Object?>{
                                      'type': 'string',
                                      'pattern': '^checkpoint:[a-f0-9]{64}\$',
                                    },
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
                                    'progressRevision': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 1,
                                      'maximum': 9007199254740991,
                                    },
                                    'rosterId': <String, Object?>{
                                      'type': 'string',
                                      'pattern': '^departure-roster:[a-f0-9]{64}\$',
                                    },
                                    'rosterHash': <String, Object?>{
                                      'type': 'string',
                                      'pattern': '^[a-f0-9]{64}\$',
                                    },
                                    'revision': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 1,
                                      'maximum': 9007199254740991,
                                    },
                                    'accountedFor': <String, Object?>{
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
                                    'reportedBy': <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 2000,
                                    },
                                    'reportedAt': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 0,
                                      'maximum': 9007199254740991,
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
                                    'createdAt': <String, Object?>{
                                      'type': 'integer',
                                      'minimum': 0,
                                      'maximum': 9007199254740991,
                                    },
                                  },
                                },
                                'dispositions': <String, Object?>{
                                  'type': 'array',
                                  'maxItems': 1000,
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
        'reporterOptions': <String, Object?>{
          'description': 'Current manager-only choices for this original checkpoint. Missing legacy values do not establish a choice list.',
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
  },
  'title': 'EventAssistanceCheckpointCallableResponse',
};
