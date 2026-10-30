// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_checkpoint_work.schema.json.

const schemaEventAssistanceCheckpointWorkSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_assistance_checkpoint_work.schema.json',
  'title': 'EventAssistanceCheckpointWork',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'kind',
    'scope',
    'rosterId',
    'rosterHash',
    'request',
    'requestedAt',
    'checkpoint',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'kind': <String, Object?>{
      'const': 'liveCheckpointReport',
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'groupId',
        'checkpointId',
        'progressRevision',
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
      },
    },
    'rosterId': <String, Object?>{
      'type': 'string',
      'pattern': '^departure-roster:[a-f0-9]{64}\$',
    },
    'rosterHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'request': <String, Object?>{
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
    'requestedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'dueAt',
        'evaluatedAt',
        'failures',
        'observation',
      ],
      'properties': <String, Object?>{
        'dueAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'evaluatedAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'failures': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 5,
        },
        'observation': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'request',
                    'reportRevision',
                    'sourceHash',
                    'ownerValidUntil',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'const': 'observed',
                    },
                    'request': <String, Object?>{
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
                    'reportRevision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'sourceHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'ownerValidUntil': <String, Object?>{
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
                    'reason',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'const': 'unavailable',
                    },
                    'reason': <String, Object?>{
                      'const': 'factsUnavailable',
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
      },
    },
    'reassignment': <String, Object?>{
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
    'closeout': <String, Object?>{
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
  },
};
