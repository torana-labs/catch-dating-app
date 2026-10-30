// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_message_intent.schema.json.

const schemaEventAssistanceMessageIntentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'intentId',
        'revision',
        'context',
        'eventId',
        'attendeeId',
        'episodeId',
        'workflow',
        'createdAt',
        'expiresAt',
        'permittedRoutes',
        'deliveryPolicy',
        'kind',
        'guidance',
        'choices',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'episodeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'workflow': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'occurrenceId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'venueReadiness',
                'routeReadiness',
                'formatReadiness',
                'rosterReadiness',
                'requiredGuestData',
                'resourceReadiness',
                'staffingReadiness',
                'messagingReadiness',
                'admissionReview',
                'financialReadiness',
                'joiningInstructions',
                'identityResolution',
                'guestAdmission',
                'guestCheckIn',
                'lateJoin',
                'participationChange',
                'guestPrerequisite',
                'allocationRepair',
                'placementConfirmation',
                'resourceRecovery',
                'fairParticipation',
                'roundPublication',
                'unitProgress',
                'outcomeRecording',
                'programmeRecovery',
                'departure',
                'checkpoint',
                'groupTransfer',
                'routeRecovery',
                'locationFreshness',
                'accountability',
                'planChangeCommunication',
                'deliveryRecovery',
                'replyOwnership',
                'guestAssistance',
                'comfortSafety',
                'attendanceSync',
                'concurrencyRecovery',
                'operationRecovery',
                'contextBoundary',
                'overrideReview',
                'eventClosure',
                'attendanceReconciliation',
                'financialReconciliation',
                'postEventFollowUp',
                'eventLearning',
              ],
              'x-catch-catalog': '../catalogs/event_assistance_workflows.json',
            },
            'occurrenceId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
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
        'permittedRoutes': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchEventSms',
              'catchEventRcs',
              'organizerEventWhatsapp',
            ],
          },
          'uniqueItems': true,
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
        'kind': <String, Object?>{
          'const': 'joiningUpdate',
          'type': 'string',
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
        'choices': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 20,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'choiceId',
              'label',
              'value',
            ],
            'properties': <String, Object?>{
              'choiceId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'value': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'intention',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'joinIntent',
                        'type': 'string',
                      },
                      'intention': <String, Object?>{
                        'oneOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                              'claimedEta',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'type': 'string',
                                'const': 'onMyWay',
                              },
                              'claimedEta': <String, Object?>{
                                'anyOf': <Object?>[
                                  <String, Object?>{
                                    'type': 'integer',
                                    'minimum': 0,
                                    'maximum': 9007199254740991,
                                    'description': 'UTC milliseconds.',
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
                              'target',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'type': 'string',
                                'const': 'joinLater',
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
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'kind',
                            ],
                            'properties': <String, Object?>{
                              'kind': <String, Object?>{
                                'type': 'string',
                                'const': 'notComing',
                              },
                            },
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
                      'category',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'requestHelp',
                        'type': 'string',
                      },
                      'category': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'eventLogistics',
                          'accessibility',
                          'comfortSafety',
                          'other',
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        'automation': <String, Object?>{
          'type': 'object',
          'description': 'Trusted live publisher binding. Queued delivery rechecks the saved policy, current group and episode outreach budget. Absence denotes the pre-existing trusted explicit publisher path, never automatic execution authority.',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'policyVersion',
            'groupId',
            'settingId',
            'settingRevision',
            'routes',
            'responseDeadline',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'lateJoin',
            },
            'policyVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'settingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'settingRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
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
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'intentId',
        'revision',
        'context',
        'eventId',
        'attendeeId',
        'episodeId',
        'workflow',
        'createdAt',
        'expiresAt',
        'permittedRoutes',
        'deliveryPolicy',
        'kind',
        'noticeKind',
        'title',
        'body',
        'instructionRevision',
        'choices',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'episodeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'workflow': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'occurrenceId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'venueReadiness',
                'routeReadiness',
                'formatReadiness',
                'rosterReadiness',
                'requiredGuestData',
                'resourceReadiness',
                'staffingReadiness',
                'messagingReadiness',
                'admissionReview',
                'financialReadiness',
                'joiningInstructions',
                'identityResolution',
                'guestAdmission',
                'guestCheckIn',
                'lateJoin',
                'participationChange',
                'guestPrerequisite',
                'allocationRepair',
                'placementConfirmation',
                'resourceRecovery',
                'fairParticipation',
                'roundPublication',
                'unitProgress',
                'outcomeRecording',
                'programmeRecovery',
                'departure',
                'checkpoint',
                'groupTransfer',
                'routeRecovery',
                'locationFreshness',
                'accountability',
                'planChangeCommunication',
                'deliveryRecovery',
                'replyOwnership',
                'guestAssistance',
                'comfortSafety',
                'attendanceSync',
                'concurrencyRecovery',
                'operationRecovery',
                'contextBoundary',
                'overrideReview',
                'eventClosure',
                'attendanceReconciliation',
                'financialReconciliation',
                'postEventFollowUp',
                'eventLearning',
              ],
              'x-catch-catalog': '../catalogs/event_assistance_workflows.json',
            },
            'occurrenceId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
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
        'permittedRoutes': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchEventSms',
              'catchEventRcs',
              'organizerEventWhatsapp',
            ],
          },
          'uniqueItems': true,
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
        'kind': <String, Object?>{
          'const': 'operationalNotice',
          'type': 'string',
        },
        'noticeKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'joiningInstructions',
            'planChanged',
            'eventCancelled',
            'eventFinished',
            'guestRequirement',
            'assignmentChanged',
            'participationCheck',
            'followUp',
          ],
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'body': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'instructionRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'choices': <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 20,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'choiceId',
              'label',
              'value',
            ],
            'properties': <String, Object?>{
              'choiceId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'value': <String, Object?>{
                'oneOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'kind',
                      'instructionRevision',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'acknowledge',
                        'type': 'string',
                      },
                      'instructionRevision': <String, Object?>{
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
                      'category',
                    ],
                    'properties': <String, Object?>{
                      'kind': <String, Object?>{
                        'const': 'requestHelp',
                        'type': 'string',
                      },
                      'category': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'eventLogistics',
                          'accessibility',
                          'comfortSafety',
                          'other',
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        'automation': <String, Object?>{
          'type': 'object',
          'description': 'Trusted live publisher binding for plan-change and follow-up notices. The delivery worker rechecks the saved assistance setting and every channel permission before sending. Absence denotes an explicit publisher path without automatic delivery authority.',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'noticeKind',
            'policyVersion',
            'groupId',
            'settingId',
            'settingRevision',
            'sourceId',
            'sourceRevision',
            'contentHash',
            'routes',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'operationalNotice',
            },
            'noticeKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'planChanged',
                'followUp',
              ],
            },
            'policyVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'settingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'settingRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'sourceId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'sourceRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'contentHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
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
          },
        },
      },
    },
  ],
  'title': 'EventAssistanceMessageIntent',
};
