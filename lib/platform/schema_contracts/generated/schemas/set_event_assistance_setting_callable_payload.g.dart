// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_assistance_setting_payload.schema.json.

const schemaSetEventAssistanceSettingCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'context',
    'groupId',
    'workflowKind',
    'requestId',
    'expectedRevision',
    'expectedSourceHash',
    'preference',
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
    'workflowKind': <String, Object?>{
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expectedSourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'preference': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'inherit',
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
              'const': 'disabled',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'template',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'configured',
            },
            'template': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'venueReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'meetingPlace',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'routeReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'route',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'formatReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'format',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'rosterReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'roster',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'requiredGuestData',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'guestData',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'resourceReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'resources',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'staffingReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'responsibilities',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'messagingReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'messaging',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'admissionReview',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'offerExpiryMinutes',
                        'admission',
                        'releaseCapacity',
                      ],
                      'properties': <String, Object?>{
                        'offerExpiryMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'admission': <String, Object?>{
                          'type': 'string',
                          'const': 'existingEntitlementPolicy',
                        },
                        'releaseCapacity': <String, Object?>{
                          'type': 'string',
                          'const': 'confirmedOnly',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'financialReadiness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirement',
                        'dueBeforeStartMinutes',
                        'disposition',
                      ],
                      'properties': <String, Object?>{
                        'requirement': <String, Object?>{
                          'type': 'string',
                          'const': 'paymentProvider',
                        },
                        'dueBeforeStartMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'disposition': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'blockSelectedOperation',
                            'hostMayAcceptException',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'joiningInstructions',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'templateIntent',
                        'audience',
                        'maximumPerGuest',
                        'expiryMinutes',
                      ],
                      'properties': <String, Object?>{
                        'templateIntent': <String, Object?>{
                          'type': 'string',
                          'const': 'joining',
                        },
                        'audience': <String, Object?>{
                          'type': 'string',
                          'const': 'affectedGuests',
                        },
                        'maximumPerGuest': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'expiryMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'identityResolution',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'ambiguousIdentity',
                        'fallback',
                      ],
                      'properties': <String, Object?>{
                        'ambiguousIdentity': <String, Object?>{
                          'type': 'string',
                          'const': 'humanResolution',
                        },
                        'fallback': <String, Object?>{
                          'type': 'string',
                          'const': 'hostAssistedOperationalOnly',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'guestAdmission',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'admission',
                        'overCapacity',
                        'exception',
                      ],
                      'properties': <String, Object?>{
                        'admission': <String, Object?>{
                          'type': 'string',
                          'const': 'existingEntitlementPolicy',
                        },
                        'overCapacity': <String, Object?>{
                          'type': 'string',
                          'const': 'deny',
                        },
                        'exception': <String, Object?>{
                          'type': 'string',
                          'const': 'authorizedHost',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'guestCheckIn',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'operation',
                        'conflict',
                        'attendanceProof',
                      ],
                      'properties': <String, Object?>{
                        'operation': <String, Object?>{
                          'type': 'string',
                          'const': 'absolute',
                        },
                        'conflict': <String, Object?>{
                          'type': 'string',
                          'const': 'revisionFence',
                        },
                        'attendanceProof': <String, Object?>{
                          'type': 'string',
                          'const': 'configuredEventPolicy',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'lateJoin',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'destination',
                        'cutoff',
                        'maxMessagesPerEpisode',
                        'minimumMinutesBetweenMessages',
                        'updateOn',
                        'unanswered',
                      ],
                      'properties': <String, Object?>{
                        'destination': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'const': 'confirmedGroupProgress',
                                },
                              },
                            },
                            <String, Object?>{
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
                                    'permittedStopIds',
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
                                    'permittedStopIds': <String, Object?>{
                                      'type': 'array',
                                      'minItems': 1,
                                      'maxItems': 1000,
                                      'items': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'uniqueItems': true,
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
                                    'permittedCheckpointIds',
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
                                    'permittedCheckpointIds': <String, Object?>{
                                      'type': 'array',
                                      'minItems': 1,
                                      'maxItems': 1000,
                                      'items': <String, Object?>{
                                        'type': 'string',
                                        'minLength': 1,
                                        'maxLength': 2000,
                                      },
                                      'uniqueItems': true,
                                    },
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        'cutoff': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'eventEnd',
                                },
                              },
                            },
                            <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'kind',
                                'at',
                              ],
                              'properties': <String, Object?>{
                                'kind': <String, Object?>{
                                  'type': 'string',
                                  'const': 'time',
                                },
                                'at': <String, Object?>{
                                  'type': 'integer',
                                  'minimum': 0,
                                  'maximum': 9007199254740991,
                                  'description': 'UTC milliseconds.',
                                },
                              },
                            },
                          ],
                        },
                        'maxMessagesPerEpisode': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 100,
                        },
                        'minimumMinutesBetweenMessages': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 1440,
                        },
                        'updateOn': <String, Object?>{
                          'type': 'string',
                          'const': 'materialGuidanceChange',
                        },
                        'unanswered': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'keepUnknownUntilCutoff',
                            'hostReviewAtDeadline',
                          ],
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'participationChange',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'eligibility',
                        'reentry',
                        'guestOptOut',
                      ],
                      'properties': <String, Object?>{
                        'eligibility': <String, Object?>{
                          'type': 'string',
                          'const': 'explicitParticipation',
                        },
                        'reentry': <String, Object?>{
                          'type': 'string',
                          'const': 'newEpisode',
                        },
                        'guestOptOut': <String, Object?>{
                          'type': 'string',
                          'const': 'honor',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'guestPrerequisite',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'requirementsFrom',
                        'fallback',
                      ],
                      'properties': <String, Object?>{
                        'requirementsFrom': <String, Object?>{
                          'type': 'string',
                          'const': 'selectedCapabilities',
                        },
                        'fallback': <String, Object?>{
                          'type': 'string',
                          'const': 'explicitlySupportedOnly',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'allocationRepair',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'scope',
                        'publication',
                        'preserveCompleted',
                        'hardConstraints',
                      ],
                      'properties': <String, Object?>{
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'futureOnly',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'preserveCompleted': <String, Object?>{
                          'type': 'boolean',
                          'const': true,
                        },
                        'hardConstraints': <String, Object?>{
                          'type': 'string',
                          'const': 'neverRelax',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'placementConfirmation',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'observation',
                        'assignmentIsNotObservation',
                      ],
                      'properties': <String, Object?>{
                        'observation': <String, Object?>{
                          'type': 'string',
                          'const': 'explicitHost',
                        },
                        'assignmentIsNotObservation': <String, Object?>{
                          'type': 'boolean',
                          'const': true,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'resourceRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'scope',
                        'publication',
                        'preserveCompleted',
                        'hardConstraints',
                        'resourceChange',
                      ],
                      'properties': <String, Object?>{
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'futureOnly',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'preserveCompleted': <String, Object?>{
                          'type': 'boolean',
                          'const': true,
                        },
                        'hardConstraints': <String, Object?>{
                          'type': 'string',
                          'const': 'neverRelax',
                        },
                        'resourceChange': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'fairParticipation',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'objective',
                        'hardConstraints',
                        'publication',
                      ],
                      'properties': <String, Object?>{
                        'objective': <String, Object?>{
                          'type': 'string',
                          'const': 'minimizeRepeatedExclusion',
                        },
                        'hardConstraints': <String, Object?>{
                          'type': 'string',
                          'const': 'neverRelax',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'roundPublication',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'futureDrafts',
                        'publication',
                        'publishedHistory',
                      ],
                      'properties': <String, Object?>{
                        'futureDrafts': <String, Object?>{
                          'type': 'string',
                          'const': 'private',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'publishedHistory': <String, Object?>{
                          'type': 'string',
                          'const': 'immutableWithCorrections',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'unitProgress',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'clock',
                        'progress',
                        'completedResults',
                      ],
                      'properties': <String, Object?>{
                        'clock': <String, Object?>{
                          'type': 'string',
                          'const': 'perUnit',
                        },
                        'progress': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'completedResults': <String, Object?>{
                          'type': 'string',
                          'const': 'preserve',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'outcomeRecording',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'correction',
                        'publication',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'completion',
                            'score',
                            'rank',
                          ],
                        },
                        'correction': <String, Object?>{
                          'type': 'string',
                          'const': 'revisionedFullRound',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'existingRevealGate',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'programmeRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'scope',
                        'publication',
                        'alreadyPublished',
                      ],
                      'properties': <String, Object?>{
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'remainingProgramme',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'alreadyPublished': <String, Object?>{
                          'type': 'string',
                          'const': 'correctExplicitly',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'departure',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'confirmation',
                        'scope',
                        'plannedTimeIsNotProof',
                      ],
                      'properties': <String, Object?>{
                        'confirmation': <String, Object?>{
                          'type': 'string',
                          'const': 'responsibleOperator',
                        },
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'perMovingGroup',
                        },
                        'plannedTimeIsNotProof': <String, Object?>{
                          'type': 'boolean',
                          'const': true,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'checkpoint',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'reportBy',
                        'scope',
                        'reportDeadlineMinutes',
                      ],
                      'properties': <String, Object?>{
                        'reportBy': <String, Object?>{
                          'type': 'string',
                          'const': 'responsibleOperator',
                        },
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'departureRoster',
                        },
                        'reportDeadlineMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'groupTransfer',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'handover',
                        'membership',
                      ],
                      'properties': <String, Object?>{
                        'handover': <String, Object?>{
                          'type': 'string',
                          'const': 'receivingOperatorAcknowledges',
                        },
                        'membership': <String, Object?>{
                          'type': 'string',
                          'const': 'singleActiveGroup',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'routeRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'scope',
                        'publication',
                        'alreadyPublished',
                        'alternative',
                      ],
                      'properties': <String, Object?>{
                        'scope': <String, Object?>{
                          'type': 'string',
                          'const': 'remainingProgramme',
                        },
                        'publication': <String, Object?>{
                          'type': 'string',
                          'const': 'hostConfirmed',
                        },
                        'alreadyPublished': <String, Object?>{
                          'type': 'string',
                          'const': 'correctExplicitly',
                        },
                        'alternative': <String, Object?>{
                          'type': 'string',
                          'const': 'hostApproved',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'locationFreshness',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'staleAfterSeconds',
                        'fallback',
                        'tracking',
                      ],
                      'properties': <String, Object?>{
                        'staleAfterSeconds': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'fallback': <String, Object?>{
                          'type': 'string',
                          'const': 'confirmedJoiningPoint',
                        },
                        'tracking': <String, Object?>{
                          'type': 'string',
                          'const': 'authorizedOperatorOnly',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'accountability',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'mode',
                        'evidence',
                        'unknownIsNotIncident',
                      ],
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'rollCall',
                            'sweep',
                          ],
                        },
                        'evidence': <String, Object?>{
                          'type': 'string',
                          'const': 'explicitDisposition',
                        },
                        'unknownIsNotIncident': <String, Object?>{
                          'type': 'boolean',
                          'const': true,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'planChangeCommunication',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'templateIntent',
                        'audience',
                        'maximumPerGuest',
                        'expiryMinutes',
                        'delivery',
                      ],
                      'properties': <String, Object?>{
                        'templateIntent': <String, Object?>{
                          'type': 'string',
                          'const': 'planChange',
                        },
                        'audience': <String, Object?>{
                          'type': 'string',
                          'const': 'affectedGuests',
                        },
                        'maximumPerGuest': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'expiryMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'delivery': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'routes',
                            'policy',
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
                            'policy': <String, Object?>{
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'deliveryRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'maximumAttempts',
                        'onUnknown',
                        'expiresAfterMinutes',
                      ],
                      'properties': <String, Object?>{
                        'maximumAttempts': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'onUnknown': <String, Object?>{
                          'type': 'string',
                          'const': 'reconcileBeforeRetry',
                        },
                        'expiresAfterMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'replyOwnership',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'owner',
                        'visibility',
                        'dueMinutes',
                      ],
                      'properties': <String, Object?>{
                        'owner': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'eventLead',
                            'groupLead',
                            'sweep',
                            'checkIn',
                            'specialist',
                          ],
                        },
                        'visibility': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'operational',
                            'restricted',
                          ],
                        },
                        'dueMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'guestAssistance',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'owner',
                        'visibility',
                        'dueMinutes',
                      ],
                      'properties': <String, Object?>{
                        'owner': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'eventLead',
                            'groupLead',
                            'sweep',
                            'checkIn',
                            'specialist',
                          ],
                        },
                        'visibility': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'operational',
                            'restricted',
                          ],
                        },
                        'dueMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'comfortSafety',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'owner',
                        'visibility',
                        'dueMinutes',
                      ],
                      'properties': <String, Object?>{
                        'owner': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'eventLead',
                            'groupLead',
                            'sweep',
                            'checkIn',
                            'specialist',
                          ],
                        },
                        'visibility': <String, Object?>{
                          'type': 'string',
                          'const': 'restricted',
                        },
                        'dueMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'attendanceSync',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'maximumAttempts',
                        'onUnknown',
                        'expiresAfterMinutes',
                      ],
                      'properties': <String, Object?>{
                        'maximumAttempts': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'onUnknown': <String, Object?>{
                          'type': 'string',
                          'const': 'reconcileBeforeRetry',
                        },
                        'expiresAfterMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'concurrencyRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'staleWrite',
                        'retry',
                      ],
                      'properties': <String, Object?>{
                        'staleWrite': <String, Object?>{
                          'type': 'string',
                          'const': 'reject',
                        },
                        'retry': <String, Object?>{
                          'type': 'string',
                          'const': 'revalidateIntent',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'operationRecovery',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'maximumAttempts',
                        'onUnknown',
                        'expiresAfterMinutes',
                      ],
                      'properties': <String, Object?>{
                        'maximumAttempts': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'onUnknown': <String, Object?>{
                          'type': 'string',
                          'const': 'reconcileBeforeRetry',
                        },
                        'expiresAfterMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'contextBoundary',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'context',
                        'crossContext',
                      ],
                      'properties': <String, Object?>{
                        'context': <String, Object?>{
                          'type': 'string',
                          'const': 'eventAndModeBound',
                        },
                        'crossContext': <String, Object?>{
                          'type': 'string',
                          'const': 'deny',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'overrideReview',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'hardLimits',
                        'permittedOverride',
                      ],
                      'properties': <String, Object?>{
                        'hardLimits': <String, Object?>{
                          'type': 'string',
                          'const': 'neverOverride',
                        },
                        'permittedOverride': <String, Object?>{
                          'type': 'string',
                          'const': 'scopedReasonedExpiring',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'eventClosure',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'pendingLiveWork',
                        'survivingObligations',
                        'unresolvedAccountability',
                      ],
                      'properties': <String, Object?>{
                        'pendingLiveWork': <String, Object?>{
                          'type': 'string',
                          'const': 'cancel',
                        },
                        'survivingObligations': <String, Object?>{
                          'type': 'string',
                          'const': 'handoff',
                        },
                        'unresolvedAccountability': <String, Object?>{
                          'type': 'string',
                          'const': 'explicitPolicy',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'attendanceReconciliation',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'silence',
                        'corrections',
                        'pendingSync',
                      ],
                      'properties': <String, Object?>{
                        'silence': <String, Object?>{
                          'type': 'string',
                          'const': 'notEvidence',
                        },
                        'corrections': <String, Object?>{
                          'type': 'string',
                          'const': 'revisioned',
                        },
                        'pendingSync': <String, Object?>{
                          'type': 'string',
                          'const': 'retain',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'financialReconciliation',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'owner',
                        'moneyMovement',
                      ],
                      'properties': <String, Object?>{
                        'owner': <String, Object?>{
                          'type': 'string',
                          'const': 'paymentProviderWorkflow',
                        },
                        'moneyMovement': <String, Object?>{
                          'type': 'string',
                          'const': 'separatelyAuthorized',
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'postEventFollowUp',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'templateIntent',
                        'audience',
                        'maximumPerGuest',
                        'expiryMinutes',
                        'delivery',
                      ],
                      'properties': <String, Object?>{
                        'templateIntent': <String, Object?>{
                          'type': 'string',
                          'const': 'followUp',
                        },
                        'audience': <String, Object?>{
                          'type': 'string',
                          'const': 'affectedGuests',
                        },
                        'maximumPerGuest': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'expiryMinutes': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 10080,
                        },
                        'delivery': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'routes',
                            'policy',
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
                            'policy': <String, Object?>{
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
                    'version',
                    'setting',
                    'config',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'eventLearning',
                    },
                    'version': <String, Object?>{
                      'const': 1,
                    },
                    'setting': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'kind',
                            'authority',
                          ],
                          'properties': <String, Object?>{
                            'kind': <String, Object?>{
                              'type': 'string',
                              'const': 'enabled',
                            },
                            'authority': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'observe',
                                'prepare',
                                'executeWithinPolicy',
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
                              'const': 'disabled',
                            },
                            'reason': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'hostChoice',
                                'organizerDefault',
                              ],
                            },
                          },
                        },
                      ],
                    },
                    'config': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'metrics',
                        'missingCoverage',
                        'sensitiveDetails',
                      ],
                      'properties': <String, Object?>{
                        'metrics': <String, Object?>{
                          'type': 'string',
                          'const': 'observedOutcomes',
                        },
                        'missingCoverage': <String, Object?>{
                          'type': 'string',
                          'const': 'explicit',
                        },
                        'sensitiveDetails': <String, Object?>{
                          'type': 'string',
                          'const': 'excluded',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
  'title': 'SetEventAssistanceSettingCallablePayload',
};
