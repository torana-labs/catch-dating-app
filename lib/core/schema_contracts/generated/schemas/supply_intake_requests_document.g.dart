// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/supply_intake_requests.schema.json.

const schemaSupplyIntakeRequestsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/supply_intake_requests.schema.json',
  'title': 'SupplyIntakeRequestDocument',
  'description': 'One organizer intake request and its processing state. Front doors create it queued; the trusted Supply Intake worker leases it, gathers the seed pages, runs the workflow and records where the reviewable listing landed. Page snapshots live in the server-only artifact store; only their hashes and paths appear here.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'supplyIntakeRequests',
  'x-firestore-path': 'supplyIntakeRequests/{requestId}',
  'x-document-id-field': 'requestId',
  'x-owner': 'trusted Supply Intake worker',
  'required': <Object?>[
    'schemaVersion',
    'requestId',
    'request',
    'status',
    'attempts',
    'leaseUntil',
    'result',
    'failure',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'request': <String, Object?>{
      'title': 'SupplyIntakeRequest',
      'description': 'One request to build an organizer listing and collect that organizer\'s events. Every front door (a sales associate or partner nomination, an organizer\'s own submission, or an Admin-started discovery run) creates one; Supply Intake gathers, reviews and stages the result for staff.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'requestId',
        'kind',
        'market',
        'seed',
        'submittedBy',
        'submittedAt',
        'origin',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}\$',
        },
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'nomination',
            'self_submission',
            'discovery',
          ],
        },
        'market': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z][a-z0-9-]{1,49}\$',
        },
        'seed': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'name',
            'urls',
            'notes',
            'categories',
          ],
          'properties': <String, Object?>{
            'name': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 160,
            },
            'urls': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2000,
                'pattern': '^https?://',
              },
            },
            'notes': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 2000,
            },
            'categories': <String, Object?>{
              'type': 'array',
              'maxItems': 8,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-z][a-z0-9_]{0,59}\$',
              },
            },
          },
          'allOf': <Object?>[
            <String, Object?>{
              'if': <String, Object?>{
                'properties': <String, Object?>{
                  'name': <String, Object?>{
                    'type': 'null',
                  },
                },
              },
              'then': <String, Object?>{
                'properties': <String, Object?>{
                  'urls': <String, Object?>{
                    'minItems': 1,
                  },
                },
              },
            },
          ],
        },
        'submittedBy': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'role',
            'uid',
            'partnerId',
          ],
          'properties': <String, Object?>{
            'role': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'associate',
                'partner',
                'organizer',
                'system',
              ],
            },
            'uid': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 128,
            },
            'partnerId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 128,
            },
          },
        },
        'submittedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'origin': <String, Object?>{
          'description': 'What created the request: an Admin nomination, a sales inbound intent (a website host application or a partner nomination), or a discovery run. Null for requests made by hand.',
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'id',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'admin_nomination',
                    'sales_inbound_intent',
                    'discovery_run',
                  ],
                },
                'id': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
                },
              },
            },
          ],
        },
      },
      'allOf': <Object?>[
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'discovery',
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'role': <String, Object?>{
                    'const': 'system',
                  },
                },
              },
            },
          },
        },
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'self_submission',
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'role': <String, Object?>{
                    'const': 'organizer',
                  },
                },
              },
            },
          },
        },
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'nomination',
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'role': <String, Object?>{
                    'enum': <Object?>[
                      'associate',
                      'partner',
                    ],
                  },
                  'uid': <String, Object?>{
                    'type': 'string',
                  },
                },
              },
            },
          },
        },
        <String, Object?>{
          'if': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'role': <String, Object?>{
                    'const': 'partner',
                  },
                },
              },
            },
          },
          'then': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'partnerId': <String, Object?>{
                    'type': 'string',
                  },
                },
              },
            },
          },
          'else': <String, Object?>{
            'properties': <String, Object?>{
              'submittedBy': <String, Object?>{
                'properties': <String, Object?>{
                  'partnerId': <String, Object?>{
                    'type': 'null',
                  },
                },
              },
            },
          },
        },
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'queued',
        'running',
        'completed',
        'failed',
      ],
    },
    'attempts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 3,
    },
    'leaseUntil': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'result': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'runId',
            'listingId',
            'listingWorkItemId',
            'eventWorkItemIds',
            'listingContentHash',
            'gaps',
            'researchNeeded',
            'eventCount',
            'stoppedReason',
            'artifactHash',
            'snapshotRefs',
            'captureReceipts',
          ],
          'properties': <String, Object?>{
            'runId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'listingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'listingWorkItemId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'eventWorkItemIds': <String, Object?>{
              'type': 'array',
              'maxItems': 60,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
            },
            'listingContentHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'gaps': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-z][a-z0-9_]{0,79}\$',
              },
            },
            'researchNeeded': <String, Object?>{
              'type': 'boolean',
            },
            'eventCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 60,
            },
            'stoppedReason': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
            },
            'artifactHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'snapshotRefs': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'pattern': '^supply-intake/snapshots/[A-Za-z0-9._:-]{1,160}/[a-f0-9]{64}\\.json\$',
              },
            },
            'captureReceipts': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'schemaVersion',
                  'runKey',
                  'adapterId',
                  'policyVersion',
                  'policyDecisionId',
                  'requestedUrl',
                  'finalUrl',
                  'outcome',
                  'status',
                  'contentType',
                  'capturedAt',
                  'snapshotHash',
                  'snapshotBytes',
                  'networkRequestsConsumed',
                  'budgetWindow',
                  'rawPayloadPersistence',
                  'firestorePersistenceAllowed',
                ],
                'properties': <String, Object?>{
                  'schemaVersion': <String, Object?>{
                    'const': 1,
                  },
                  'runKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'adapterId': <String, Object?>{
                    'enum': <Object?>[
                      'page_fetch',
                      'static_page',
                    ],
                  },
                  'policyVersion': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'policyDecisionId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 200,
                  },
                  'requestedUrl': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 2000,
                  },
                  'finalUrl': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 2000,
                  },
                  'outcome': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-z][a-z_]{0,59}\$',
                  },
                  'status': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 100,
                    'maximum': 599,
                  },
                  'contentType': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 120,
                  },
                  'capturedAt': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'format': 'date-time',
                  },
                  'snapshotHash': <String, Object?>{
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
                  'snapshotBytes': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'networkRequestsConsumed': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 200,
                  },
                  'budgetWindow': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'null',
                      },
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'monthKey',
                          'intakeConsumed',
                          'intakeLimit',
                          'monthConsumed',
                          'monthLimit',
                        ],
                        'properties': <String, Object?>{
                          'monthKey': <String, Object?>{
                            'type': 'string',
                            'pattern': '^[0-9]{4}-[0-9]{2}\$',
                          },
                          'intakeConsumed': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'intakeLimit': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'monthConsumed': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'monthLimit': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                        },
                      },
                    ],
                  },
                  'rawPayloadPersistence': <String, Object?>{
                    'const': 'external_artifact_store_only',
                  },
                  'firestorePersistenceAllowed': <String, Object?>{
                    'const': false,
                  },
                },
              },
            },
          },
        },
      ],
    },
    'failure': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'code',
            'message',
            'at',
            'attempts',
          ],
          'properties': <String, Object?>{
            'code': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_.-]{1,80}\$',
            },
            'message': <String, Object?>{
              'type': 'string',
              'maxLength': 500,
            },
            'at': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'attempts': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 3,
            },
          },
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'hash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'captureReceipt': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'runKey',
        'adapterId',
        'policyVersion',
        'policyDecisionId',
        'requestedUrl',
        'finalUrl',
        'outcome',
        'status',
        'contentType',
        'capturedAt',
        'snapshotHash',
        'snapshotBytes',
        'networkRequestsConsumed',
        'budgetWindow',
        'rawPayloadPersistence',
        'firestorePersistenceAllowed',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'runKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'adapterId': <String, Object?>{
          'enum': <Object?>[
            'page_fetch',
            'static_page',
          ],
        },
        'policyVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'policyDecisionId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 200,
        },
        'requestedUrl': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'finalUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 2000,
        },
        'outcome': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z][a-z_]{0,59}\$',
        },
        'status': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 100,
          'maximum': 599,
        },
        'contentType': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'capturedAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'date-time',
        },
        'snapshotHash': <String, Object?>{
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
        'snapshotBytes': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'networkRequestsConsumed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 200,
        },
        'budgetWindow': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'monthKey',
                'intakeConsumed',
                'intakeLimit',
                'monthConsumed',
                'monthLimit',
              ],
              'properties': <String, Object?>{
                'monthKey': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[0-9]{4}-[0-9]{2}\$',
                },
                'intakeConsumed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'intakeLimit': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'monthConsumed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'monthLimit': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
          ],
        },
        'rawPayloadPersistence': <String, Object?>{
          'const': 'external_artifact_store_only',
        },
        'firestorePersistenceAllowed': <String, Object?>{
          'const': false,
        },
      },
    },
  },
};
