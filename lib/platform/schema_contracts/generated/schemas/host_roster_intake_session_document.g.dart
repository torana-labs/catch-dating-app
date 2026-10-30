// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_roster_intake_sessions.schema.json.

const schemaHostRosterIntakeSessionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_roster_intake_sessions.schema.json',
  'title': 'HostRosterIntakeSessionDocument',
  'description': 'Private resumable Host review state for one existing event roster upload.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostRosterIntakeSessions',
  'x-firestore-path': 'hostRosterIntakeSessions/{sessionId}',
  'x-document-id-field': 'sessionId',
  'x-owner': 'manageHostRosterIntake callable; no client reads or writes',
  'required': <Object?>[
    'draft',
    'createdAtMillis',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'draft': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'hostUid',
        'organizerId',
        'eventId',
        'fileFingerprint',
        'fileName',
        'format',
        'headers',
        'mapping',
        'sourceManifest',
        'revision',
        'state',
        'rows',
        'excludedRowIds',
        'appliedImportId',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^hri_[a-f0-9]{48}\$',
        },
        'hostUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'fileFingerprint': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
          ],
        },
        'headers': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'mapping': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'displayName': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'phone': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'email': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'city': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'externalReference': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'arrivalGroup': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'ticketType': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'revenueAmount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'revenueCurrency': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'status': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
          },
        },
        'sourceManifest': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'sourceRowNumber',
              'rawEvidenceHash',
              'originalValue',
              'originalFields',
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
              'rawEvidenceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'originalValue': <String, Object?>{
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
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 80,
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
              'originalFields': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'displayName': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'phone': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'email': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'cityMarketId': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'externalReference': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'arrivalGroup': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'ticketType': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueAmountMinor': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueCurrency': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueSource': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'status': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'review',
            'applied',
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
              'value',
              'sourceRowNumber',
              'fields',
            ],
            'properties': <String, Object?>{
              'value': <String, Object?>{
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
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 80,
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
              'sourceRowNumber': <String, Object?>{
                'type': 'integer',
                'minimum': 2,
                'maximum': 100000,
              },
              'fields': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'displayName': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'phone': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'email': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'cityMarketId': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'externalReference': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'arrivalGroup': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'ticketType': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueAmountMinor': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueCurrency': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueSource': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'status': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                },
              },
              'rawCells': <String, Object?>{
                'type': 'array',
                'maxItems': 40,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 500,
                },
              },
              'issues': <String, Object?>{
                'type': 'array',
                'maxItems': 10,
                'items': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-z][a-z0-9-]{0,79}\$',
                },
              },
            },
          },
        },
        'excludedRowIds': <String, Object?>{
          'type': 'array',
          'maxItems': 250,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'appliedImportId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
      },
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
  'definitions': <String, Object?>{
    'sourceField': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'column',
        'header',
        'origin',
        'confidence',
      ],
      'properties': <String, Object?>{
        'column': <String, Object?>{
          'type': 'integer',
          'minimum': -1,
          'maximum': 39,
        },
        'header': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'origin': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'upload',
            'hostCorrection',
            'modelProposal',
          ],
        },
        'confidence': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': 0,
          'maximum': 1,
        },
      },
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'phone': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'email': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'cityMarketId': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'externalReference': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'arrivalGroup': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'ticketType': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'revenueAmountMinor': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'revenueCurrency': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'revenueSource': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
        'status': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'column',
            'header',
            'origin',
            'confidence',
          ],
          'properties': <String, Object?>{
            'column': <String, Object?>{
              'type': 'integer',
              'minimum': -1,
              'maximum': 39,
            },
            'header': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'upload',
                'hostCorrection',
                'modelProposal',
              ],
            },
            'confidence': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': 0,
              'maximum': 1,
            },
          },
        },
      },
    },
    'value': <String, Object?>{
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
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
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
    'intakeRow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'sourceRowNumber',
        'fields',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
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
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
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
        'sourceRowNumber': <String, Object?>{
          'type': 'integer',
          'minimum': 2,
          'maximum': 100000,
        },
        'fields': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'displayName': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'phone': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'email': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'cityMarketId': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'externalReference': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'arrivalGroup': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'ticketType': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueAmountMinor': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueCurrency': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueSource': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'status': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
          },
        },
        'rawCells': <String, Object?>{
          'type': 'array',
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'maxLength': 500,
          },
        },
        'issues': <String, Object?>{
          'type': 'array',
          'maxItems': 10,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-z][a-z0-9-]{0,79}\$',
          },
        },
      },
    },
    'mapping': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'phone': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'email': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'city': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'externalReference': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'arrivalGroup': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'ticketType': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'revenueAmount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'revenueCurrency': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
        'status': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 39,
        },
      },
    },
    'manifestRow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'rowId',
        'sourceRowNumber',
        'rawEvidenceHash',
        'originalValue',
        'originalFields',
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
        'rawEvidenceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'originalValue': <String, Object?>{
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
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
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
        'originalFields': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'displayName': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'phone': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'email': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'cityMarketId': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'externalReference': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'arrivalGroup': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'ticketType': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueAmountMinor': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueCurrency': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'revenueSource': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
            'status': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'column',
                'header',
                'origin',
                'confidence',
              ],
              'properties': <String, Object?>{
                'column': <String, Object?>{
                  'type': 'integer',
                  'minimum': -1,
                  'maximum': 39,
                },
                'header': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'origin': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'upload',
                    'hostCorrection',
                    'modelProposal',
                  ],
                },
                'confidence': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 1,
                },
              },
            },
          },
        },
      },
    },
    'draft': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'hostUid',
        'organizerId',
        'eventId',
        'fileFingerprint',
        'fileName',
        'format',
        'headers',
        'mapping',
        'sourceManifest',
        'revision',
        'state',
        'rows',
        'excludedRowIds',
        'appliedImportId',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^hri_[a-f0-9]{48}\$',
        },
        'hostUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'fileFingerprint': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
          ],
        },
        'headers': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'mapping': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'displayName': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'phone': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'email': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'city': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'externalReference': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'arrivalGroup': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'ticketType': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'revenueAmount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'revenueCurrency': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
            'status': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 39,
            },
          },
        },
        'sourceManifest': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'rowId',
              'sourceRowNumber',
              'rawEvidenceHash',
              'originalValue',
              'originalFields',
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
              'rawEvidenceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'originalValue': <String, Object?>{
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
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 80,
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
              'originalFields': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'displayName': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'phone': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'email': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'cityMarketId': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'externalReference': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'arrivalGroup': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'ticketType': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueAmountMinor': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueCurrency': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueSource': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'status': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'review',
            'applied',
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
              'value',
              'sourceRowNumber',
              'fields',
            ],
            'properties': <String, Object?>{
              'value': <String, Object?>{
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
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 80,
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
              'sourceRowNumber': <String, Object?>{
                'type': 'integer',
                'minimum': 2,
                'maximum': 100000,
              },
              'fields': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'displayName': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'phone': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'email': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'cityMarketId': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'externalReference': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'arrivalGroup': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'ticketType': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueAmountMinor': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueCurrency': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'revenueSource': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                  'status': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'column',
                      'header',
                      'origin',
                      'confidence',
                    ],
                    'properties': <String, Object?>{
                      'column': <String, Object?>{
                        'type': 'integer',
                        'minimum': -1,
                        'maximum': 39,
                      },
                      'header': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'upload',
                          'hostCorrection',
                          'modelProposal',
                        ],
                      },
                      'confidence': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': 0,
                        'maximum': 1,
                      },
                    },
                  },
                },
              },
              'rawCells': <String, Object?>{
                'type': 'array',
                'maxItems': 40,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 500,
                },
              },
              'issues': <String, Object?>{
                'type': 'array',
                'maxItems': 10,
                'items': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-z][a-z0-9-]{0,79}\$',
                },
              },
            },
          },
        },
        'excludedRowIds': <String, Object?>{
          'type': 'array',
          'maxItems': 250,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'appliedImportId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
      },
    },
  },
};
