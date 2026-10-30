// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_roster_intake_receipts.schema.json.

const schemaHostRosterIntakeReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_roster_intake_receipts.schema.json',
  'title': 'HostRosterIntakeReceiptDocument',
  'description': 'Private exact reviewed payload and outcome used for lost-response replay.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostRosterIntakeReceipts',
  'x-firestore-path': 'hostRosterIntakeSessions/{sessionId}/receipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'manageHostRosterIntake callable; atomically committed with canonical import',
  'required': <Object?>[
    'importId',
    'appliedAtMillis',
    'preview',
    'payload',
  ],
  'properties': <String, Object?>{
    'importId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'appliedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'preview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'revision',
        'reviewHash',
        'rows',
        'counts',
        'eligibleForApply',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^hri_[a-f0-9]{48}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'rows': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'sourceRowNumber',
              'displayName',
              'externalReference',
              'attendeeId',
              'kind',
              'changedFields',
              'fieldChanges',
              'issueCode',
            ],
            'properties': <String, Object?>{
              'rowId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'sourceRowNumber': <String, Object?>{
                'type': 'integer',
                'minimum': 2,
                'maximum': 100000,
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'maxLength': 120,
              },
              'externalReference': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'attendeeId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 128,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'add',
                  'update',
                  'unchanged',
                  'excluded',
                  'needsReview',
                  'identityConflict',
                ],
              },
              'changedFields': <String, Object?>{
                'type': 'array',
                'maxItems': 11,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'displayName',
                    'phone',
                    'email',
                    'cityMarketId',
                    'externalReference',
                    'arrivalGroup',
                    'ticketType',
                    'revenueAmountMinor',
                    'revenueCurrency',
                    'revenueSource',
                    'status',
                  ],
                },
              },
              'fieldChanges': <String, Object?>{
                'type': 'array',
                'maxItems': 11,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'field',
                    'currentValue',
                    'proposedValue',
                    'origin',
                  ],
                  'properties': <String, Object?>{
                    'field': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'displayName',
                        'phone',
                        'email',
                        'cityMarketId',
                        'externalReference',
                        'arrivalGroup',
                        'ticketType',
                        'revenueAmountMinor',
                        'revenueCurrency',
                        'revenueSource',
                        'status',
                      ],
                    },
                    'currentValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
                    },
                    'proposedValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
                    },
                    'origin': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'enum': <Object?>[
                        'upload',
                        'hostCorrection',
                        'modelProposal',
                        'default',
                        null,
                      ],
                    },
                  },
                },
              },
              'issueCode': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 80,
              },
            },
          },
        },
        'counts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'add',
            'update',
            'unchanged',
            'excluded',
            'needsReview',
            'identityConflict',
          ],
          'properties': <String, Object?>{
            'add': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'update': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'unchanged': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'excluded': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'needsReview': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'identityConflict': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
          },
        },
        'eligibleForApply': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'payload': <String, Object?>{
      'title': 'ImportEventAttendeesCallablePayload',
      'description': 'Callable payload accepted by importEventAttendees.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'importKey',
        'fileName',
        'format',
        'rows',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'importKey': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 120,
        },
        'fileName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 255,
        },
        'format': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'csv',
            'xlsx',
            'manual',
          ],
        },
        'rows': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'displayName',
              'status',
            ],
            'properties': <String, Object?>{
              'rowId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'phone': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 40,
              },
              'email': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 320,
              },
              'cityMarketId': <String, Object?>{
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
              'externalReference': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'arrivalGroup': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'ticketType': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 120,
              },
              'revenueAmountMinor': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'revenueCurrency': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'pattern': '^[A-Z]{3}\$',
              },
              'revenueSource': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'enum': <Object?>[
                  'hostImport',
                  'hostEstimate',
                  null,
                ],
              },
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'invited',
                  'registered',
                  'waitlisted',
                ],
              },
            },
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'previewKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'add',
        'update',
        'unchanged',
        'excluded',
        'needsReview',
        'identityConflict',
      ],
    },
    'changedField': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'displayName',
        'phone',
        'email',
        'cityMarketId',
        'externalReference',
        'arrivalGroup',
        'ticketType',
        'revenueAmountMinor',
        'revenueCurrency',
        'revenueSource',
        'status',
      ],
    },
    'previewRow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'rowId',
        'sourceRowNumber',
        'displayName',
        'externalReference',
        'attendeeId',
        'kind',
        'changedFields',
        'fieldChanges',
        'issueCode',
      ],
      'properties': <String, Object?>{
        'rowId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'sourceRowNumber': <String, Object?>{
          'type': 'integer',
          'minimum': 2,
          'maximum': 100000,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'maxLength': 120,
        },
        'externalReference': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'attendeeId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 128,
        },
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'add',
            'update',
            'unchanged',
            'excluded',
            'needsReview',
            'identityConflict',
          ],
        },
        'changedFields': <String, Object?>{
          'type': 'array',
          'maxItems': 11,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'displayName',
              'phone',
              'email',
              'cityMarketId',
              'externalReference',
              'arrivalGroup',
              'ticketType',
              'revenueAmountMinor',
              'revenueCurrency',
              'revenueSource',
              'status',
            ],
          },
        },
        'fieldChanges': <String, Object?>{
          'type': 'array',
          'maxItems': 11,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'field',
              'currentValue',
              'proposedValue',
              'origin',
            ],
            'properties': <String, Object?>{
              'field': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'displayName',
                  'phone',
                  'email',
                  'cityMarketId',
                  'externalReference',
                  'arrivalGroup',
                  'ticketType',
                  'revenueAmountMinor',
                  'revenueCurrency',
                  'revenueSource',
                  'status',
                ],
              },
              'currentValue': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 500,
              },
              'proposedValue': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 500,
              },
              'origin': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'enum': <Object?>[
                  'upload',
                  'hostCorrection',
                  'modelProposal',
                  'default',
                  null,
                ],
              },
            },
          },
        },
        'issueCode': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
      },
    },
    'fieldChange': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'field',
        'currentValue',
        'proposedValue',
        'origin',
      ],
      'properties': <String, Object?>{
        'field': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'displayName',
            'phone',
            'email',
            'cityMarketId',
            'externalReference',
            'arrivalGroup',
            'ticketType',
            'revenueAmountMinor',
            'revenueCurrency',
            'revenueSource',
            'status',
          ],
        },
        'currentValue': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 500,
        },
        'proposedValue': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 500,
        },
        'origin': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'upload',
            'hostCorrection',
            'modelProposal',
            'default',
            null,
          ],
        },
      },
    },
    'counts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'add',
        'update',
        'unchanged',
        'excluded',
        'needsReview',
        'identityConflict',
      ],
      'properties': <String, Object?>{
        'add': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
        'update': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
        'unchanged': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
        'excluded': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
        'needsReview': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
        'identityConflict': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 250,
        },
      },
    },
    'preview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'revision',
        'reviewHash',
        'rows',
        'counts',
        'eligibleForApply',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^hri_[a-f0-9]{48}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'reviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'rows': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'sourceRowNumber',
              'displayName',
              'externalReference',
              'attendeeId',
              'kind',
              'changedFields',
              'fieldChanges',
              'issueCode',
            ],
            'properties': <String, Object?>{
              'rowId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'sourceRowNumber': <String, Object?>{
                'type': 'integer',
                'minimum': 2,
                'maximum': 100000,
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'maxLength': 120,
              },
              'externalReference': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'attendeeId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 128,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'add',
                  'update',
                  'unchanged',
                  'excluded',
                  'needsReview',
                  'identityConflict',
                ],
              },
              'changedFields': <String, Object?>{
                'type': 'array',
                'maxItems': 11,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'displayName',
                    'phone',
                    'email',
                    'cityMarketId',
                    'externalReference',
                    'arrivalGroup',
                    'ticketType',
                    'revenueAmountMinor',
                    'revenueCurrency',
                    'revenueSource',
                    'status',
                  ],
                },
              },
              'fieldChanges': <String, Object?>{
                'type': 'array',
                'maxItems': 11,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'field',
                    'currentValue',
                    'proposedValue',
                    'origin',
                  ],
                  'properties': <String, Object?>{
                    'field': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'displayName',
                        'phone',
                        'email',
                        'cityMarketId',
                        'externalReference',
                        'arrivalGroup',
                        'ticketType',
                        'revenueAmountMinor',
                        'revenueCurrency',
                        'revenueSource',
                        'status',
                      ],
                    },
                    'currentValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
                    },
                    'proposedValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
                    },
                    'origin': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'enum': <Object?>[
                        'upload',
                        'hostCorrection',
                        'modelProposal',
                        'default',
                        null,
                      ],
                    },
                  },
                },
              },
              'issueCode': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 80,
              },
            },
          },
        },
        'counts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'add',
            'update',
            'unchanged',
            'excluded',
            'needsReview',
            'identityConflict',
          ],
          'properties': <String, Object?>{
            'add': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'update': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'unchanged': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'excluded': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'needsReview': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
            'identityConflict': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 250,
            },
          },
        },
        'eligibleForApply': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  },
};
