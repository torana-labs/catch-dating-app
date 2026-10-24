// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/work_item.schema.json.

const schemaOperationWorkItemSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/work_item.schema.json',
  'title': 'OperationWorkItem',
  'description': 'One exclusively staged unit of work. Task flags are orthogonal and may overlap.',
  'type': 'object',
  'additionalProperties': false,
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'organizer_listing_draft',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'organizer',
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'listing',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'organizer_listing_draft',
                  },
                  'listing': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'listingId',
                      'requestId',
                      'kind',
                      'submittedBy',
                      'submittedAt',
                      'seed',
                      'organizer',
                      'fieldEvidence',
                      'eventCount',
                      'pastEventCount',
                      'pages',
                      'gaps',
                      'researchNeeded',
                      'contentHash',
                    ],
                    'properties': <String, Object?>{
                      'listingId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'requestId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'kind': <String, Object?>{
                        'enum': <Object?>[
                          'nomination',
                          'self_submission',
                          'discovery',
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
                            'enum': <Object?>[
                              'associate',
                              'partner',
                              'organizer',
                              'system',
                            ],
                          },
                          'uid': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'partnerId': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                        },
                      },
                      'submittedAt': <String, Object?>{
                        'type': 'string',
                        'minLength': 10,
                        'maxLength': 40,
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
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'urls': <String, Object?>{
                            'type': 'array',
                            'maxItems': 10,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 2000,
                            },
                          },
                          'notes': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 2000,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'categories': <String, Object?>{
                            'type': 'array',
                            'maxItems': 40,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                        },
                      },
                      'organizer': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'name',
                          'description',
                          'imageUrl',
                          'locality',
                          'categories',
                          'links',
                          'identityKeys',
                        ],
                        'properties': <String, Object?>{
                          'name': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'description': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 2000,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'imageUrl': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 2000,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'locality': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'categories': <String, Object?>{
                            'type': 'array',
                            'maxItems': 40,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                          'links': <String, Object?>{
                            'type': 'array',
                            'maxItems': 20,
                            'items': <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'platform',
                                'surfaceKind',
                                'url',
                                'normalizedKey',
                                'evidenceUrl',
                              ],
                              'properties': <String, Object?>{
                                'platform': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                'surfaceKind': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                'url': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 2000,
                                },
                                'normalizedKey': <String, Object?>{
                                  'anyOf': <Object?>[
                                    <String, Object?>{
                                      'type': 'string',
                                      'minLength': 1,
                                      'maxLength': 500,
                                    },
                                    <String, Object?>{
                                      'type': 'null',
                                    },
                                  ],
                                },
                                'evidenceUrl': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 2000,
                                },
                              },
                            },
                          },
                          'identityKeys': <String, Object?>{
                            'type': 'array',
                            'maxItems': 40,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                        },
                      },
                      'fieldEvidence': <String, Object?>{
                        'type': 'array',
                        'maxItems': 20,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'field',
                            'sourceUrl',
                            'method',
                            'adapterId',
                          ],
                          'properties': <String, Object?>{
                            'field': <String, Object?>{
                              'enum': <Object?>[
                                'name',
                                'description',
                                'imageUrl',
                                'locality',
                              ],
                            },
                            'sourceUrl': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 2000,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                            'method': <String, Object?>{
                              'enum': <Object?>[
                                'adapter',
                                'nominator',
                                'agent',
                              ],
                            },
                            'adapterId': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                          },
                        },
                      },
                      'eventCount': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 60,
                      },
                      'pastEventCount': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                      },
                      'pages': <String, Object?>{
                        'type': 'array',
                        'maxItems': 12,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'url',
                            'via',
                            'platform',
                            'outcome',
                            'adapterId',
                            'pageKind',
                            'abstainReason',
                            'snapshotHash',
                            'capturedAt',
                          ],
                          'properties': <String, Object?>{
                            'url': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 2000,
                            },
                            'via': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 2000,
                            },
                            'platform': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                            'outcome': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                            'adapterId': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                            'pageKind': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                            'abstainReason': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
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
                            'capturedAt': <String, Object?>{
                              'anyOf': <Object?>[
                                <String, Object?>{
                                  'type': 'string',
                                  'minLength': 10,
                                  'maxLength': 40,
                                },
                                <String, Object?>{
                                  'type': 'null',
                                },
                              ],
                            },
                          },
                        },
                      },
                      'gaps': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'researchNeeded': <String, Object?>{
                        'type': 'boolean',
                      },
                      'contentHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'listing_event_candidate',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'event',
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'event',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'listing_event_candidate',
                  },
                  'event': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'listingId',
                      'listingWorkItemId',
                      'requestId',
                      'eventKey',
                      'platform',
                      'sourceEntityId',
                      'title',
                      'description',
                      'startAt',
                      'endAt',
                      'timezone',
                      'venue',
                      'address',
                      'locality',
                      'latitude',
                      'longitude',
                      'sourceUrl',
                      'imageUrl',
                      'price',
                      'status',
                      'attendanceMode',
                      'organizerName',
                      'organizerUrl',
                      'adapterId',
                      'evidenceFields',
                      'alsoListedAt',
                    ],
                    'properties': <String, Object?>{
                      'listingId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'listingWorkItemId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'requestId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'eventKey': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'platform': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'sourceEntityId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'title': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'description': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'startAt': <String, Object?>{
                        'type': 'string',
                        'minLength': 10,
                        'maxLength': 40,
                      },
                      'endAt': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 10,
                            'maxLength': 40,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'timezone': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'venue': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'address': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'locality': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'latitude': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'number',
                            'minimum': -90,
                            'maximum': 90,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'longitude': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'number',
                            'minimum': -180,
                            'maximum': 180,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'sourceUrl': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      'imageUrl': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'price': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'maxProperties': 8,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'status': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'attendanceMode': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'organizerName': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'organizerUrl': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'adapterId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'evidenceFields': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'alsoListedAt': <String, Object?>{
                        'type': 'array',
                        'maxItems': 10,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 2000,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'liveCheckpointReport',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'checkpoint_report',
          },
          'normalizedPayload': <String, Object?>{
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
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'operationalNoticeFanout',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'notice_fanout',
          },
          'normalizedPayload': <String, Object?>{
            'title': 'EventAssistanceOperationalNoticeFanout',
            'description': 'Private bounded attendee fanout for one trusted plan-change or post-event source. The work binds a reviewed policy revision and grants no provider authority by itself.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'schemaVersion',
              'kind',
              'signalId',
              'context',
              'source',
              'policyBinding',
              'expiresAt',
              'checkpoint',
            ],
            'properties': <String, Object?>{
              'schemaVersion': <String, Object?>{
                'type': 'integer',
                'const': 1,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'operationalNoticeFanout',
              },
              'signalId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
              'source': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'sourceId',
                  'revision',
                  'occurredAt',
                  'validUntil',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'planChange',
                      'followUp',
                    ],
                  },
                  'sourceId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'occurredAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'validUntil': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                },
              },
              'policyBinding': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'groupId',
                  'workflowKind',
                  'settingId',
                  'settingRevision',
                ],
                'properties': <String, Object?>{
                  'groupId': <String, Object?>{
                    'type': 'string',
                    'const': 'event:whole',
                  },
                  'workflowKind': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'planChangeCommunication',
                      'postEventFollowUp',
                    ],
                  },
                  'settingId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'settingRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                },
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
              'checkpoint': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'phase',
                  'cursor',
                  'visited',
                  'published',
                  'skipped',
                  'dueAt',
                  'failures',
                  'retries',
                  'stopReason',
                ],
                'properties': <String, Object?>{
                  'phase': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'scan',
                      'retry',
                      'complete',
                      'review',
                      'expired',
                      'stopped',
                    ],
                  },
                  'cursor': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'visited': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
                  'published': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
                  'skipped': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
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
                  'failures': <String, Object?>{
                    'type': 'array',
                    'maxItems': 100,
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
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                        'reason': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'unavailable',
                          ],
                        },
                      },
                    },
                  },
                  'retries': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 5,
                  },
                  'stopReason': <String, Object?>{
                    'enum': <Object?>[
                      null,
                      'policyUnavailable',
                      'policyChanged',
                      'sourceChanged',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'liveMessageDelivery',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'message_delivery',
          },
          'normalizedPayload': <String, Object?>{
            'title': 'EventAssistanceDeliveryWork',
            'description': 'Private resumable delivery coordination for one published automatic message. The outbox owns provider attempts; a checkpoint never grants dispatch authority.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'schemaVersion',
              'kind',
              'messageId',
              'intentHash',
              'threadId',
              'scope',
              'createdAt',
              'expiresAt',
              'checkpoint',
            ],
            'properties': <String, Object?>{
              'schemaVersion': <String, Object?>{
                'type': 'integer',
                'const': 1,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'liveMessageDelivery',
              },
              'messageId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'intentHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'threadId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'scope': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'context',
                  'attendeeId',
                  'episodeId',
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
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'episodeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                },
              },
              'createdAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'checkpoint': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'phase',
                      'reason',
                      'dueAt',
                      'messageRevision',
                      'messageHash',
                      'failures',
                      'evaluations',
                    ],
                    'properties': <String, Object?>{
                      'phase': <String, Object?>{
                        'type': 'string',
                        'const': 'queued',
                      },
                      'reason': <String, Object?>{
                        'type': 'null',
                      },
                      'dueAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'failures': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                        'const': 0,
                      },
                      'evaluations': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100,
                        'const': 0,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'phase',
                      'reason',
                      'dueAt',
                      'messageRevision',
                      'messageHash',
                      'failures',
                      'evaluations',
                    ],
                    'properties': <String, Object?>{
                      'phase': <String, Object?>{
                        'type': 'string',
                        'const': 'complete',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'delivered',
                          'responded',
                          'cancelled',
                          'superseded',
                          'expired',
                          'eventClosed',
                          'permissionRevoked',
                          'guestPresent',
                          'guestDeclined',
                          'notAdmitted',
                          'hostStopped',
                          'participationInactive',
                        ],
                      },
                      'dueAt': <String, Object?>{
                        'type': 'null',
                      },
                      'messageRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'failures': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                      },
                      'evaluations': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'phase',
                      'reason',
                      'dueAt',
                      'messageRevision',
                      'messageHash',
                      'failures',
                      'evaluations',
                    ],
                    'properties': <String, Object?>{
                      'phase': <String, Object?>{
                        'type': 'string',
                        'const': 'receipt',
                      },
                      'reason': <String, Object?>{
                        'const': 'providerPending',
                      },
                      'dueAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'failures': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                      },
                      'evaluations': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'phase',
                      'reason',
                      'dueAt',
                      'messageRevision',
                      'messageHash',
                      'failures',
                      'evaluations',
                    ],
                    'properties': <String, Object?>{
                      'phase': <String, Object?>{
                        'type': 'string',
                        'const': 'retry',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'retryBackoff',
                          'eventFactsStale',
                          'routeFactsStale',
                          'workerUnavailable',
                        ],
                      },
                      'dueAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'failures': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                      },
                      'evaluations': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'phase',
                      'reason',
                      'dueAt',
                      'messageRevision',
                      'messageHash',
                      'failures',
                      'evaluations',
                    ],
                    'properties': <String, Object?>{
                      'phase': <String, Object?>{
                        'type': 'string',
                        'const': 'review',
                      },
                      'reason': <String, Object?>{
                        'enum': <Object?>[
                          'noEligibleRoute',
                          'attemptLimit',
                          'policyRejected',
                          'recipientNeedsReview',
                          'providerOwnsFallback',
                          'conflictingDeliveryEvidence',
                          'providerPending',
                          'workerUnavailable',
                          'recoveryLimit',
                          'eventFactsStale',
                          'routeFactsStale',
                        ],
                      },
                      'dueAt': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      'messageHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      'failures': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                      },
                      'evaluations': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 100,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'liveRosterEnrollment',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'runtime_roster',
          },
          'normalizedPayload': <String, Object?>{
            'title': 'EventAssistanceRosterWork',
            'description': 'Private resumable roster enrollment bound to current manager runtime permission. Enrollment never infers attendance or sends messages.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'schemaVersion',
              'kind',
              'signalId',
              'source',
              'scope',
              'expiresAt',
              'checkpoint',
              'runtimeBinding',
            ],
            'properties': <String, Object?>{
              'schemaVersion': <String, Object?>{
                'const': 1,
                'type': 'integer',
              },
              'kind': <String, Object?>{
                'const': 'liveRosterEnrollment',
                'type': 'string',
              },
              'signalId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'source': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'eventId',
                  'collection',
                  'documentId',
                  'occurredAt',
                ],
                'properties': <String, Object?>{
                  'eventId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'collection': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'eventAttendees',
                      'eventAssistanceGuests',
                      'eventAssistanceRuntimeConfigs',
                    ],
                  },
                  'documentId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'occurredAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                },
              },
              'scope': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'context',
                  'attendeeId',
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
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'checkpoint': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'phase',
                  'cursor',
                  'visited',
                  'dueAt',
                  'failures',
                  'retries',
                  'stopReason',
                ],
                'properties': <String, Object?>{
                  'phase': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'scan',
                      'retry',
                      'complete',
                      'review',
                      'expired',
                      'stopped',
                    ],
                  },
                  'cursor': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'visited': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
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
                  'failures': <String, Object?>{
                    'type': 'array',
                    'maxItems': 100,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'attendeeId',
                        'reason',
                      ],
                      'properties': <String, Object?>{
                        'reason': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'busy',
                            'unavailable',
                          ],
                        },
                        'attendeeId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                        },
                      },
                    },
                  },
                  'retries': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 5,
                  },
                  'stopReason': <String, Object?>{
                    'enum': <Object?>[
                      null,
                      'missing',
                      'paused',
                      'configurationChanged',
                      'sourceChanged',
                      'expired',
                      'eventClosed',
                    ],
                  },
                },
              },
              'runtimeBinding': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'runtimeId',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'runtimeId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'liveSourceWake',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'source_signal',
          },
          'normalizedPayload': <String, Object?>{
            'title': 'EventAssistanceSourceWork',
            'description': 'Private bounded source-change fanout using Operations work items. Waking work grants no domain or provider authority.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'schemaVersion',
              'kind',
              'signalId',
              'source',
              'scope',
              'expiresAt',
              'checkpoint',
            ],
            'properties': <String, Object?>{
              'schemaVersion': <String, Object?>{
                'const': 1,
                'type': 'integer',
              },
              'kind': <String, Object?>{
                'const': 'liveSourceWake',
                'type': 'string',
              },
              'signalId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'source': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'eventId',
                  'collection',
                  'documentId',
                  'occurredAt',
                ],
                'properties': <String, Object?>{
                  'eventId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'collection': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'events',
                      'eventAttendees',
                      'eventSuccessPlans',
                      'eventAssistanceGuests',
                      'eventAssistanceSettings',
                      'eventAssistanceGroupProgress',
                      'eventAssistanceMemberships',
                      'eventAssistanceMessages',
                      'eventAssistanceRuntimeConfigs',
                      'eventAssistanceSmsPermissions',
                      'eventAssistanceWhatsappPermissions',
                      'eventAssistanceSmsSenders',
                      'eventAssistanceSmsBudgets',
                      'organizerSenderConnections',
                      'eventAssistanceWhatsappPolicies',
                      'organizerMessageTemplates',
                      'eventAssistanceWhatsappBudgets',
                      'organizerWhatsappEndpointStops',
                      'organizerContactChannelStates',
                      'eventStaffGrants',
                      'eventAssistanceRcsPermissions',
                      'eventAssistanceRcsSenders',
                      'eventAssistanceRcsBudgets',
                      'eventAssistanceRcsSubscriptions',
                    ],
                  },
                  'documentId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'occurredAt': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                },
              },
              'scope': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'context',
                      'attendeeId',
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
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'description': 'Refresh only existing checkpoint requests whose immutable departure roster contains this attendee. Never enroll guests or dispatch messages.',
                    'required': <Object?>[
                      'kind',
                      'context',
                      'attendeeId',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'checkpointMember',
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
                      'attendeeId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'routeId',
                      'senderId',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'sender',
                      },
                      'routeId': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'catchEventSms',
                          'organizerEventWhatsapp',
                          'catchEventRcs',
                        ],
                      },
                      'senderId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'organizerId',
                      'recipientEndpointId',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'whatsappEndpoint',
                      },
                      'organizerId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'recipientEndpointId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^whatsapp:[a-f0-9]{64}\$',
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'subscriptionId',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'type': 'string',
                        'const': 'rcsSubscription',
                      },
                      'subscriptionId': <String, Object?>{
                        'type': 'string',
                        'pattern': '^rcs-subscription:[a-f0-9]{64}\$',
                      },
                    },
                  },
                ],
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'checkpoint': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'phase',
                  'cursor',
                  'visited',
                  'dueAt',
                  'failures',
                  'retries',
                ],
                'properties': <String, Object?>{
                  'phase': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'scan',
                      'retry',
                      'complete',
                      'review',
                      'expired',
                    ],
                  },
                  'cursor': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'visited': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
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
                  'failures': <String, Object?>{
                    'type': 'array',
                    'maxItems': 100,
                    'items': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'workItemId',
                            'reason',
                          ],
                          'properties': <String, Object?>{
                            'workItemId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 180,
                              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'busy',
                                'unavailable',
                              ],
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'targetKey',
                            'reason',
                          ],
                          'properties': <String, Object?>{
                            'targetKey': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 180,
                              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'busy',
                                'unavailable',
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                  'retries': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 5,
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'liveLateJoin',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'workflowId': <String, Object?>{
            'const': 'event-assistance',
          },
          'entityKind': <String, Object?>{
            'const': 'guest_episode',
          },
          'normalizedPayload': <String, Object?>{
            'title': 'EventAssistanceLiveWork',
            'description': 'Private normalized payload for one durable live guest episode. Due times and evaluation state are explicit; publication is not provider delivery.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'schemaVersion',
              'kind',
              'scope',
              'options',
              'expiresAt',
              'maxEvaluations',
              'checkpoint',
            ],
            'properties': <String, Object?>{
              'schemaVersion': <String, Object?>{
                'type': 'integer',
                'const': 1,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'const': 'liveLateJoin',
              },
              'scope': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'context',
                  'attendeeId',
                  'episodeId',
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
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'episodeId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                },
              },
              'options': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'routes',
                  'responseDeadline',
                  'deliveryPolicy',
                ],
                'properties': <String, Object?>{
                  'routes': <String, Object?>{
                    'type': 'array',
                    'minItems': 1,
                    'maxItems': 3,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'oneOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'routeId',
                            'senderId',
                          ],
                          'properties': <String, Object?>{
                            'routeId': <String, Object?>{
                              'type': 'string',
                              'const': 'catchEventSms',
                            },
                            'senderId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 160,
                              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'routeId',
                            'senderId',
                          ],
                          'properties': <String, Object?>{
                            'routeId': <String, Object?>{
                              'type': 'string',
                              'const': 'organizerEventWhatsapp',
                            },
                            'senderId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 160,
                              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'routeId',
                            'senderId',
                          ],
                          'properties': <String, Object?>{
                            'routeId': <String, Object?>{
                              'type': 'string',
                              'const': 'catchEventRcs',
                            },
                            'senderId': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 160,
                              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                            },
                          },
                        },
                      ],
                    },
                  },
                  'responseDeadline': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 9007199254740991,
                      },
                      <String, Object?>{
                        'type': 'null',
                        'const': null,
                      },
                    ],
                  },
                  'deliveryPolicy': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'maxAttempts',
                      'maxAttemptsPerRoute',
                      'minimumRetrySeconds',
                    ],
                    'properties': <String, Object?>{
                      'maxAttempts': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 6,
                      },
                      'maxAttemptsPerRoute': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 3,
                      },
                      'minimumRetrySeconds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 3600,
                      },
                    },
                  },
                  'laterChoices': <String, Object?>{
                    'type': 'array',
                    'maxItems': 17,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'label',
                        'target',
                      ],
                      'properties': <String, Object?>{
                        'label': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
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
                      },
                    },
                  },
                },
              },
              'expiresAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'maxEvaluations': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 10000,
              },
              'checkpoint': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'dueAt',
                  'evaluatedAt',
                  'evaluations',
                  'sourceHash',
                  'observation',
                  'publication',
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
                        'const': null,
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
                        'const': null,
                      },
                    ],
                  },
                  'evaluations': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
                  'sourceHash': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                      <String, Object?>{
                        'type': 'null',
                        'const': null,
                      },
                    ],
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
                              'decision',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'type': 'string',
                                'const': 'decision',
                              },
                              'decision': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'reason',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'resolved',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'joined',
                                          'declined',
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
                                        'type': 'string',
                                        'const': 'cancelled',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'eventClosed',
                                          'notAdmitted',
                                          'policyDisabled',
                                          'participationInactive',
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
                                        'type': 'string',
                                        'const': 'expired',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'cutoff',
                                          'lateEntryClosed',
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
                                        'type': 'string',
                                        'const': 'wait',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'departureUnconfirmed',
                                          'attendanceUnknown',
                                          'guidanceUnavailable',
                                          'throttled',
                                          'unchanged',
                                          'participationUnknown',
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
                                      'guidance',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'hostDecision',
                                      },
                                      'reason': <String, Object?>{
                                        'type': 'string',
                                        'enum': <Object?>[
                                          'unreachable',
                                          'entryDecision',
                                          'missingInformation',
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
                                            'const': null,
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  <String, Object?>{
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'required': <Object?>[
                                      'kind',
                                      'guidance',
                                      'messageKey',
                                      'shouldSend',
                                      'nextEvaluationAt',
                                    ],
                                    'properties': <String, Object?>{
                                      'kind': <String, Object?>{
                                        'type': 'string',
                                        'const': 'update',
                                      },
                                      'guidance': <String, Object?>{
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
                                      'messageKey': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'shouldSend': <String, Object?>{
                                        'type': 'boolean',
                                      },
                                      'nextEvaluationAt': <String, Object?>{
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
                                    },
                                  },
                                ],
                                'title': 'EventAssistanceLateJoinDecision',
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
                                'type': 'string',
                                'const': 'sourceNotReady',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'episodeMissing',
                                  'guestSourceChanged',
                                  'membershipMissing',
                                  'membershipSourceChanged',
                                  'unconfigured',
                                  'disabled',
                                  'settingSourceChanged',
                                  'eventClosed',
                                  'runtimeNotLive',
                                  'progressUnconfirmed',
                                  'progressSourceChanged',
                                  'destinationUnavailable',
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
                                'type': 'string',
                                'const': 'historyUnavailable',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'historyLimit',
                                  'deliveryConflict',
                                  'ambiguousHistory',
                                ],
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
                                'type': 'string',
                                'const': 'responseDeadlineMissing',
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
                                'type': 'string',
                                'const': 'episodeChanged',
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
                                'type': 'string',
                                'const': 'workExpired',
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
                                'type': 'string',
                                'const': 'evaluationLimit',
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
                                'type': 'string',
                                'const': 'runtimeUnavailable',
                              },
                              'reason': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'missing',
                                  'paused',
                                  'configurationChanged',
                                  'sourceChanged',
                                  'expired',
                                  'eventClosed',
                                ],
                              },
                            },
                          },
                        ],
                      },
                      <String, Object?>{
                        'type': 'null',
                        'const': null,
                      },
                    ],
                  },
                  'publication': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'messageId',
                          'threadId',
                        ],
                        'properties': <String, Object?>{
                          'messageId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                          'threadId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                          },
                        },
                      },
                      <String, Object?>{
                        'type': 'null',
                        'const': null,
                      },
                    ],
                  },
                },
              },
              'runtimeBinding': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'runtimeId',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'runtimeId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'lifecycleStatus': <String, Object?>{
            'const': 'terminal',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'outcome': <String, Object?>{
            'type': 'string',
            'not': <String, Object?>{
              'const': 'published',
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'lifecycleStatus': <String, Object?>{
            'const': 'published',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'outcome': <String, Object?>{
            'const': 'published',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'lifecycleStatus': <String, Object?>{
            'enum': <Object?>[
              'queued',
              'in_progress',
              'waiting',
              'ready',
            ],
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'outcome': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'required': <Object?>[
              'blockerCodes',
            ],
            'properties': <String, Object?>{
              'blockerCodes': <String, Object?>{
                'contains': <String, Object?>{
                  'const': 'human_review_required',
                },
              },
            },
          },
          <String, Object?>{
            'required': <Object?>[
              'normalizedPayload',
            ],
            'properties': <String, Object?>{
              'normalizedPayload': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'owner',
                ],
                'properties': <String, Object?>{
                  'owner': <String, Object?>{
                    'const': 'human',
                  },
                },
              },
            },
          },
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'taskFlags': <String, Object?>{
            'contains': <String, Object?>{
              'const': 'human_review_required',
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'lifecycleStatus',
        ],
        'properties': <String, Object?>{
          'lifecycleStatus': <String, Object?>{
            'enum': <Object?>[
              'published',
              'terminal',
            ],
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'taskFlags': <String, Object?>{
            'not': <String, Object?>{
              'contains': <String, Object?>{
                'const': 'human_review_required',
              },
            },
          },
          'blockerCodes': <String, Object?>{
            'not': <String, Object?>{
              'contains': <String, Object?>{
                'const': 'human_review_required',
              },
            },
          },
          'normalizedPayload': <String, Object?>{
            'not': <String, Object?>{
              'required': <Object?>[
                'owner',
              ],
              'properties': <String, Object?>{
                'owner': <String, Object?>{
                  'const': 'human',
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'organizer_publication_packet',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'packet',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'organizer_publication_packet',
                  },
                  'packet': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'packetId',
                      'entityId',
                      'canonicalHostId',
                      'displayName',
                      'status',
                      'priority',
                      'markets',
                      'blockers',
                      'dataBlockers',
                      'evidenceBlockers',
                      'approvalChecklist',
                      'evidenceSummary',
                      'publicPresence',
                      'adminDecision',
                      'nextActions',
                    ],
                    'properties': <String, Object?>{
                      'packetId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'entityId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'canonicalHostId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'displayName': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'status': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'priority': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'markets': <String, Object?>{
                        'type': 'array',
                        'maxItems': 8,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'slug',
                            'displayName',
                          ],
                          'properties': <String, Object?>{
                            'slug': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                            'displayName': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                        },
                      },
                      'blockers': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'dataBlockers': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'evidenceBlockers': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'approvalChecklist': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'crawlDisabledReviewed',
                          'identityReviewed',
                          'marketScopeReviewed',
                          'mediaRightsReviewed',
                          'ownerSafeCopyReviewed',
                          'surfaceInventoryReviewed',
                        ],
                        'properties': <String, Object?>{
                          'crawlDisabledReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                          'identityReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                          'marketScopeReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                          'mediaRightsReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                          'ownerSafeCopyReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                          'surfaceInventoryReviewed': <String, Object?>{
                            'type': 'boolean',
                          },
                        },
                      },
                      'evidenceSummary': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'records',
                          'manualReportsWithoutArtifacts',
                          'unresolvedLocalRefs',
                          'missingSurfaceEvidence',
                          'rawProviderArtifactRefs',
                          'firestoreForbiddenArtifactRefs',
                          'riskFlags',
                        ],
                        'properties': <String, Object?>{
                          'records': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'manualReportsWithoutArtifacts': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'unresolvedLocalRefs': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'missingSurfaceEvidence': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'rawProviderArtifactRefs': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'firestoreForbiddenArtifactRefs': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                          },
                          'riskFlags': <String, Object?>{
                            'type': 'array',
                            'maxItems': 12,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                        },
                      },
                      'publicPresence': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'canonicalPath',
                          'claimTargetPath',
                          'publishStatus',
                          'indexStatus',
                          'appVisibility',
                          'projectionStatus',
                        ],
                        'properties': <String, Object?>{
                          'canonicalPath': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'claimTargetPath': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              <String, Object?>{
                                'type': 'null',
                              },
                            ],
                          },
                          'publishStatus': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          'indexStatus': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          'appVisibility': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          'projectionStatus': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                        },
                      },
                      'adminDecision': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'allowedDecisions',
                          'defaultAppVisibility',
                          'currentDecision',
                        ],
                        'properties': <String, Object?>{
                          'allowedDecisions': <String, Object?>{
                            'type': 'array',
                            'maxItems': 40,
                            'items': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                          },
                          'defaultAppVisibility': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          'currentDecision': <String, Object?>{
                            'anyOf': <Object?>[
                              <String, Object?>{
                                'type': 'null',
                              },
                              <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'decision',
                                  'publishStatus',
                                  'indexStatus',
                                  'decidedAt',
                                  'appVisibility',
                                ],
                                'properties': <String, Object?>{
                                  'decision': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  'publishStatus': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  'indexStatus': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  'decidedAt': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  'appVisibility': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                },
                              },
                            ],
                          },
                        },
                      },
                      'nextActions': <String, Object?>{
                        'type': 'array',
                        'maxItems': 12,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'supply_freshness_coverage',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'coverage',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'supply_freshness_coverage',
                  },
                  'coverage': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'schemaVersion',
                      'recordType',
                      'coverageId',
                      'runId',
                      'kind',
                      'scopeKey',
                      'runKey',
                      'market',
                      'sourceProfileId',
                      'entityId',
                      'surfaceId',
                      'schedulerStatus',
                      'surfacePolicy',
                      'fetchEnabled',
                      'completedAt',
                      'policyVersion',
                      'requestHash',
                    ],
                    'properties': <String, Object?>{
                      'schemaVersion': <String, Object?>{
                        'type': 'integer',
                        'const': 1,
                      },
                      'recordType': <String, Object?>{
                        'const': 'supply_freshness_coverage',
                      },
                      'coverageId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'runId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'kind': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'city_discovery_sweep',
                          'candidate_verification',
                          'known_organizer_event_refresh',
                          'event_detail_prepublication',
                        ],
                      },
                      'scopeKey': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'runKey': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 500,
                      },
                      'market': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 80,
                      },
                      'sourceProfileId': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 160,
                      },
                      'entityId': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 200,
                      },
                      'surfaceId': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 200,
                      },
                      'schedulerStatus': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 40,
                      },
                      'surfacePolicy': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 80,
                      },
                      'fetchEnabled': <String, Object?>{
                        'type': 'boolean',
                      },
                      'completedAt': <String, Object?>{
                        'type': 'string',
                        'format': 'date-time',
                      },
                      'policyVersion': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'requestHash': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{64}\$',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'orphan_event_candidate',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'event',
          },
          'lifecycleStatus': <String, Object?>{
            'not': <String, Object?>{
              'const': 'published',
            },
          },
          'blockerCodes': <String, Object?>{
            'contains': <String, Object?>{
              'const': 'organizer_not_in_inventory',
            },
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'candidate',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'orphan_event_candidate',
                  },
                  'candidate': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': true,
                    'required': <Object?>[
                      'id',
                      'candidateId',
                      'publicationEligibility',
                      'blockerCodes',
                      'attribution',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'candidateId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'publicationEligibility': <String, Object?>{
                        'const': 'blocked_orphan',
                      },
                      'blockerCodes': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'contains': <String, Object?>{
                          'const': 'organizer_not_in_inventory',
                        },
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'attribution': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'state',
                          'organizerEvidence',
                          'match',
                        ],
                        'properties': <String, Object?>{
                          'state': <String, Object?>{
                            'const': 'orphan',
                          },
                          'organizerEvidence': <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'name',
                              'url',
                            ],
                            'properties': <String, Object?>{
                              'name': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  <String, Object?>{
                                    'type': 'null',
                                  },
                                ],
                              },
                              'url': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 500,
                                  },
                                  <String, Object?>{
                                    'type': 'null',
                                  },
                                ],
                              },
                            },
                          },
                          'match': <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'decision',
                              'policyId',
                              'threshold',
                              'rationale',
                              'matchedEntityId',
                              'score',
                              'matchingSignals',
                              'blockingKeys',
                            ],
                            'properties': <String, Object?>{
                              'decision': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              'policyId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              'threshold': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
                              },
                              'rationale': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 500,
                              },
                              'matchedEntityId': <String, Object?>{
                                'type': 'null',
                              },
                              'score': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
                              },
                              'matchingSignals': <String, Object?>{
                                'type': 'array',
                                'maxItems': 40,
                                'items': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                              },
                              'blockingKeys': <String, Object?>{
                                'type': 'array',
                                'maxItems': 40,
                                'items': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 500,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_candidate',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'event',
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'candidate',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_candidate',
                  },
                  'candidate': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': true,
                    'required': <Object?>[
                      'id',
                      'title',
                      'startDate',
                      'sourceResultIds',
                      'reviewState',
                      'requiresVerification',
                      'warnings',
                      'blockerCodes',
                      'publicationEligibility',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'title': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'startDate': <String, Object?>{
                        'type': 'string',
                        'maxLength': 40,
                      },
                      'sourceResultIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'reviewState': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'requiresVerification': <String, Object?>{
                        'type': 'boolean',
                      },
                      'warnings': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'blockerCodes': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'publicationEligibility': <String, Object?>{
                        'const': 'review_gated',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_source_result',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'source_result',
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'result',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_source_result',
                  },
                  'result': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'sourceProfileId',
                      'sourceLabel',
                      'queryTemplateId',
                      'resultType',
                      'title',
                      'url',
                      'snippet',
                      'observedAt',
                      'status',
                      'riskFlags',
                      'operatorNotes',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'sourceProfileId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'sourceLabel': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'queryTemplateId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'resultType': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'title': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'url': <String, Object?>{
                        'type': 'string',
                        'maxLength': 2000,
                      },
                      'snippet': <String, Object?>{
                        'type': 'string',
                        'maxLength': 1000,
                      },
                      'observedAt': <String, Object?>{
                        'type': 'string',
                        'maxLength': 80,
                      },
                      'status': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'riskFlags': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                      'operatorNotes': <String, Object?>{
                        'type': 'string',
                        'maxLength': 1000,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'normalizedPayload': <String, Object?>{
            'type': 'object',
            'required': <Object?>[
              'intake',
            ],
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'required': <Object?>[
                  'recordType',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_source_profile',
                  },
                },
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'entityKind': <String, Object?>{
            'const': 'source_profile',
          },
          'normalizedPayload': <String, Object?>{
            'properties': <String, Object?>{
              'intake': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'recordType',
                  'profile',
                ],
                'properties': <String, Object?>{
                  'recordType': <String, Object?>{
                    'const': 'event_source_profile',
                  },
                  'profile': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'label',
                      'type',
                      'status',
                      'cadence',
                      'riskLevel',
                      'allowedUse',
                      'items',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'type': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'status': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'cadence': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'riskLevel': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'low',
                          'medium',
                          'high',
                        ],
                      },
                      'allowedUse': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'items': <String, Object?>{
                        'type': 'array',
                        'maxItems': 40,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'label',
                            'url',
                          ],
                          'properties': <String, Object?>{
                            'label': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 500,
                            },
                            'url': <String, Object?>{
                              'type': 'string',
                              'maxLength': 2000,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'boundedString': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'boundedStringArray': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 500,
      },
    },
    'eventCandidateIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'candidate',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'event_candidate',
        },
        'candidate': <String, Object?>{
          'type': 'object',
          'additionalProperties': true,
          'required': <Object?>[
            'id',
            'title',
            'startDate',
            'sourceResultIds',
            'reviewState',
            'requiresVerification',
            'warnings',
            'blockerCodes',
            'publicationEligibility',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'title': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'startDate': <String, Object?>{
              'type': 'string',
              'maxLength': 40,
            },
            'sourceResultIds': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'reviewState': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'requiresVerification': <String, Object?>{
              'type': 'boolean',
            },
            'warnings': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'blockerCodes': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'publicationEligibility': <String, Object?>{
              'const': 'review_gated',
            },
          },
        },
      },
    },
    'eventSourceResultIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'result',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'event_source_result',
        },
        'result': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'id',
            'sourceProfileId',
            'sourceLabel',
            'queryTemplateId',
            'resultType',
            'title',
            'url',
            'snippet',
            'observedAt',
            'status',
            'riskFlags',
            'operatorNotes',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'sourceProfileId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'sourceLabel': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'queryTemplateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'resultType': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'title': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'url': <String, Object?>{
              'type': 'string',
              'maxLength': 2000,
            },
            'snippet': <String, Object?>{
              'type': 'string',
              'maxLength': 1000,
            },
            'observedAt': <String, Object?>{
              'type': 'string',
              'maxLength': 80,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'riskFlags': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'operatorNotes': <String, Object?>{
              'type': 'string',
              'maxLength': 1000,
            },
          },
        },
      },
    },
    'eventSourceProfileIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'profile',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'event_source_profile',
        },
        'profile': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'id',
            'label',
            'type',
            'status',
            'cadence',
            'riskLevel',
            'allowedUse',
            'items',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'type': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'cadence': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'riskLevel': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
            'allowedUse': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'items': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'label',
                  'url',
                ],
                'properties': <String, Object?>{
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'url': <String, Object?>{
                    'type': 'string',
                    'maxLength': 2000,
                  },
                },
              },
            },
          },
        },
      },
    },
    'organizerListingDraftIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'listing',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'organizer_listing_draft',
        },
        'listing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'listingId',
            'requestId',
            'kind',
            'submittedBy',
            'submittedAt',
            'seed',
            'organizer',
            'fieldEvidence',
            'eventCount',
            'pastEventCount',
            'pages',
            'gaps',
            'researchNeeded',
            'contentHash',
          ],
          'properties': <String, Object?>{
            'listingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'requestId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'kind': <String, Object?>{
              'enum': <Object?>[
                'nomination',
                'self_submission',
                'discovery',
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
                  'enum': <Object?>[
                    'associate',
                    'partner',
                    'organizer',
                    'system',
                  ],
                },
                'uid': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'partnerId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
            'submittedAt': <String, Object?>{
              'type': 'string',
              'minLength': 10,
              'maxLength': 40,
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
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'urls': <String, Object?>{
                  'type': 'array',
                  'maxItems': 10,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 2000,
                  },
                },
                'notes': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'categories': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
              },
            },
            'organizer': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'name',
                'description',
                'imageUrl',
                'locality',
                'categories',
                'links',
                'identityKeys',
              ],
              'properties': <String, Object?>{
                'name': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'description': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'imageUrl': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'locality': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'categories': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
                'links': <String, Object?>{
                  'type': 'array',
                  'maxItems': 20,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'platform',
                      'surfaceKind',
                      'url',
                      'normalizedKey',
                      'evidenceUrl',
                    ],
                    'properties': <String, Object?>{
                      'platform': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'surfaceKind': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      'url': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      'normalizedKey': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 500,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'evidenceUrl': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                    },
                  },
                },
                'identityKeys': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
              },
            },
            'fieldEvidence': <String, Object?>{
              'type': 'array',
              'maxItems': 20,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'field',
                  'sourceUrl',
                  'method',
                  'adapterId',
                ],
                'properties': <String, Object?>{
                  'field': <String, Object?>{
                    'enum': <Object?>[
                      'name',
                      'description',
                      'imageUrl',
                      'locality',
                    ],
                  },
                  'sourceUrl': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'method': <String, Object?>{
                    'enum': <Object?>[
                      'adapter',
                      'nominator',
                      'agent',
                    ],
                  },
                  'adapterId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
            },
            'eventCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 60,
            },
            'pastEventCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'pages': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'url',
                  'via',
                  'platform',
                  'outcome',
                  'adapterId',
                  'pageKind',
                  'abstainReason',
                  'snapshotHash',
                  'capturedAt',
                ],
                'properties': <String, Object?>{
                  'url': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 2000,
                  },
                  'via': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 2000,
                  },
                  'platform': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'outcome': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'adapterId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'pageKind': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'abstainReason': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
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
                  'capturedAt': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 10,
                        'maxLength': 40,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
            },
            'gaps': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'researchNeeded': <String, Object?>{
              'type': 'boolean',
            },
            'contentHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      },
    },
    'listingEventCandidateIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'event',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'listing_event_candidate',
        },
        'event': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'listingId',
            'listingWorkItemId',
            'requestId',
            'eventKey',
            'platform',
            'sourceEntityId',
            'title',
            'description',
            'startAt',
            'endAt',
            'timezone',
            'venue',
            'address',
            'locality',
            'latitude',
            'longitude',
            'sourceUrl',
            'imageUrl',
            'price',
            'status',
            'attendanceMode',
            'organizerName',
            'organizerUrl',
            'adapterId',
            'evidenceFields',
            'alsoListedAt',
          ],
          'properties': <String, Object?>{
            'listingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'listingWorkItemId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'requestId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'eventKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'platform': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'sourceEntityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'title': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'description': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'startAt': <String, Object?>{
              'type': 'string',
              'minLength': 10,
              'maxLength': 40,
            },
            'endAt': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 10,
                  'maxLength': 40,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'timezone': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'venue': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'address': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'locality': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'latitude': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'number',
                  'minimum': -90,
                  'maximum': 90,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'longitude': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'number',
                  'minimum': -180,
                  'maximum': 180,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'sourceUrl': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'imageUrl': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'price': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'maxProperties': 8,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'status': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'attendanceMode': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'organizerName': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'organizerUrl': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'adapterId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'evidenceFields': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'alsoListedAt': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2000,
              },
            },
          },
        },
      },
    },
    'orphanEventCandidateIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'candidate',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'orphan_event_candidate',
        },
        'candidate': <String, Object?>{
          'type': 'object',
          'additionalProperties': true,
          'required': <Object?>[
            'id',
            'candidateId',
            'publicationEligibility',
            'blockerCodes',
            'attribution',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'candidateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'publicationEligibility': <String, Object?>{
              'const': 'blocked_orphan',
            },
            'blockerCodes': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'contains': <String, Object?>{
                'const': 'organizer_not_in_inventory',
              },
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'attribution': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'state',
                'organizerEvidence',
                'match',
              ],
              'properties': <String, Object?>{
                'state': <String, Object?>{
                  'const': 'orphan',
                },
                'organizerEvidence': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'name',
                    'url',
                  ],
                  'properties': <String, Object?>{
                    'name': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'url': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                  },
                },
                'match': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'decision',
                    'policyId',
                    'threshold',
                    'rationale',
                    'matchedEntityId',
                    'score',
                    'matchingSignals',
                    'blockingKeys',
                  ],
                  'properties': <String, Object?>{
                    'decision': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    'policyId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    'threshold': <String, Object?>{
                      'type': 'number',
                      'minimum': 0,
                      'maximum': 1,
                    },
                    'rationale': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    'matchedEntityId': <String, Object?>{
                      'type': 'null',
                    },
                    'score': <String, Object?>{
                      'type': 'number',
                      'minimum': 0,
                      'maximum': 1,
                    },
                    'matchingSignals': <String, Object?>{
                      'type': 'array',
                      'maxItems': 40,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                    },
                    'blockingKeys': <String, Object?>{
                      'type': 'array',
                      'maxItems': 40,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'supplyFreshnessCoverageIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'coverage',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'supply_freshness_coverage',
        },
        'coverage': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'schemaVersion',
            'recordType',
            'coverageId',
            'runId',
            'kind',
            'scopeKey',
            'runKey',
            'market',
            'sourceProfileId',
            'entityId',
            'surfaceId',
            'schedulerStatus',
            'surfacePolicy',
            'fetchEnabled',
            'completedAt',
            'policyVersion',
            'requestHash',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'type': 'integer',
              'const': 1,
            },
            'recordType': <String, Object?>{
              'const': 'supply_freshness_coverage',
            },
            'coverageId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'runId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'city_discovery_sweep',
                'candidate_verification',
                'known_organizer_event_refresh',
                'event_detail_prepublication',
              ],
            },
            'scopeKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'runKey': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 500,
            },
            'market': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
            },
            'sourceProfileId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'entityId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 200,
            },
            'surfaceId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 200,
            },
            'schedulerStatus': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 40,
            },
            'surfacePolicy': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
            },
            'fetchEnabled': <String, Object?>{
              'type': 'boolean',
            },
            'completedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'policyVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'requestHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
      },
    },
    'organizerPublicationPacketIntake': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'recordType',
        'packet',
      ],
      'properties': <String, Object?>{
        'recordType': <String, Object?>{
          'const': 'organizer_publication_packet',
        },
        'packet': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'packetId',
            'entityId',
            'canonicalHostId',
            'displayName',
            'status',
            'priority',
            'markets',
            'blockers',
            'dataBlockers',
            'evidenceBlockers',
            'approvalChecklist',
            'evidenceSummary',
            'publicPresence',
            'adminDecision',
            'nextActions',
          ],
          'properties': <String, Object?>{
            'packetId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'entityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'canonicalHostId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'displayName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'status': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'priority': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'markets': <String, Object?>{
              'type': 'array',
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'slug',
                  'displayName',
                ],
                'properties': <String, Object?>{
                  'slug': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  'displayName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
              },
            },
            'blockers': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'dataBlockers': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'evidenceBlockers': <String, Object?>{
              'type': 'array',
              'maxItems': 40,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
            'approvalChecklist': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'crawlDisabledReviewed',
                'identityReviewed',
                'marketScopeReviewed',
                'mediaRightsReviewed',
                'ownerSafeCopyReviewed',
                'surfaceInventoryReviewed',
              ],
              'properties': <String, Object?>{
                'crawlDisabledReviewed': <String, Object?>{
                  'type': 'boolean',
                },
                'identityReviewed': <String, Object?>{
                  'type': 'boolean',
                },
                'marketScopeReviewed': <String, Object?>{
                  'type': 'boolean',
                },
                'mediaRightsReviewed': <String, Object?>{
                  'type': 'boolean',
                },
                'ownerSafeCopyReviewed': <String, Object?>{
                  'type': 'boolean',
                },
                'surfaceInventoryReviewed': <String, Object?>{
                  'type': 'boolean',
                },
              },
            },
            'evidenceSummary': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'records',
                'manualReportsWithoutArtifacts',
                'unresolvedLocalRefs',
                'missingSurfaceEvidence',
                'rawProviderArtifactRefs',
                'firestoreForbiddenArtifactRefs',
                'riskFlags',
              ],
              'properties': <String, Object?>{
                'records': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'manualReportsWithoutArtifacts': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'unresolvedLocalRefs': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'missingSurfaceEvidence': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'rawProviderArtifactRefs': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'firestoreForbiddenArtifactRefs': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'riskFlags': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
              },
            },
            'publicPresence': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'canonicalPath',
                'claimTargetPath',
                'publishStatus',
                'indexStatus',
                'appVisibility',
                'projectionStatus',
              ],
              'properties': <String, Object?>{
                'canonicalPath': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'claimTargetPath': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'publishStatus': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'indexStatus': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'appVisibility': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'projectionStatus': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
              },
            },
            'adminDecision': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'allowedDecisions',
                'defaultAppVisibility',
                'currentDecision',
              ],
              'properties': <String, Object?>{
                'allowedDecisions': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                },
                'defaultAppVisibility': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'currentDecision': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'null',
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'decision',
                        'publishStatus',
                        'indexStatus',
                        'decidedAt',
                        'appVisibility',
                      ],
                      'properties': <String, Object?>{
                        'decision': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        'publishStatus': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        'indexStatus': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        'decidedAt': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                        'appVisibility': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 500,
                        },
                      },
                    },
                  ],
                },
              },
            },
            'nextActions': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
            },
          },
        },
      },
    },
  },
  'required': <Object?>[
    'schemaVersion',
    'workItemId',
    'workflowId',
    'runId',
    'entityKind',
    'externalKey',
    'revision',
    'candidateHash',
    'primaryStage',
    'lifecycleStatus',
    'outcome',
    'taskFlags',
    'blockerCodes',
    'warningCodes',
    'priority',
    'attemptCount',
    'evidenceRefs',
    'fieldProvenance',
    'normalizedPayload',
    'decisionId',
    'publicationPlanId',
    'createdAt',
    'updatedAt',
    'staleAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'workItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'workflowId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z][a-z0-9_-]*\$',
    },
    'runId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'entityKind': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'pattern': '^[a-z][a-z0-9_]*\$',
    },
    'externalKey': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'candidateHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'primaryStage': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'pattern': '^[a-z][a-z0-9_]*\$',
    },
    'lifecycleStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'queued',
        'in_progress',
        'waiting',
        'ready',
        'published',
        'terminal',
      ],
    },
    'outcome': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'pattern': '^[a-z][a-z0-9_]*\$',
    },
    'taskFlags': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z][a-z0-9_.:-]*\$',
      },
    },
    'blockerCodes': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z][a-z0-9_.:-]*\$',
      },
    },
    'warningCodes': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z][a-z0-9_.:-]*\$',
      },
    },
    'priority': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'attemptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'evidenceRefs': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'artifactId',
          'contentHash',
          'observedAt',
          'locator',
        ],
        'properties': <String, Object?>{
          'artifactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'observedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'locator': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
        },
      },
    },
    'fieldProvenance': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'field',
          'artifactId',
          'contentHash',
          'locator',
          'extractedBy',
          'extractorVersion',
          'confidence',
        ],
        'properties': <String, Object?>{
          'field': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'artifactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'locator': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
          'extractedBy': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'deterministic',
              'model',
              'human',
            ],
          },
          'extractorVersion': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
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
    'normalizedPayload': <String, Object?>{
      'type': 'object',
      'additionalProperties': true,
    },
    'decisionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'publicationPlanId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
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
    'staleAt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
  },
};
