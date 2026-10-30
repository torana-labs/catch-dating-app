// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_checkpoint_receipts.schema.json.

const schemaEventAssistanceCheckpointReceiptDocumentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'receiptId',
        'requestHash',
        'report',
      ],
      'properties': <String, Object?>{
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^checkpoint-action:[a-f0-9]{64}\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'receiptId',
        'requestHash',
        'scope',
        'rosterHash',
        'workItemRevision',
        'assignment',
      ],
      'properties': <String, Object?>{
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^checkpoint-reassignment:[a-f0-9]{64}\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'rosterHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'workItemRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'assignment': <String, Object?>{
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
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'receiptId',
        'requestHash',
        'scope',
        'rosterHash',
        'workItemRevision',
        'closeout',
      ],
      'properties': <String, Object?>{
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^checkpoint-closeout:[a-f0-9]{64}\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        'rosterHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'workItemRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
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
    },
  ],
  'title': 'EventAssistanceCheckpointReceiptDocument',
  'x-firestore-collection': 'eventAssistanceCheckpointReceipts',
  'x-firestore-path': 'eventAssistanceCheckpointReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event-assistance checkpoint command',
};
