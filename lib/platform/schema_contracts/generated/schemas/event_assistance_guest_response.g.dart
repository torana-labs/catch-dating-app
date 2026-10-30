// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_guest_response.schema.json.

const schemaEventAssistanceGuestResponseSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'responseId',
        'intentId',
        'intentRevision',
        'eventId',
        'attendeeId',
        'episodeId',
        'choiceId',
        'receivedAt',
        'value',
        'context',
        'source',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
        'choiceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
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
            'linkId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'guestWeb',
              'type': 'string',
            },
            'linkId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
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
        'responseId',
        'intentId',
        'intentRevision',
        'eventId',
        'attendeeId',
        'episodeId',
        'choiceId',
        'receivedAt',
        'value',
        'context',
        'source',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
        'choiceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
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
            'attemptId',
            'providerEventId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'provider',
              'type': 'string',
            },
            'attemptId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'providerEventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
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
        'responseId',
        'intentId',
        'intentRevision',
        'eventId',
        'attendeeId',
        'episodeId',
        'choiceId',
        'receivedAt',
        'value',
        'context',
        'source',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
        'choiceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
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
        'context': <String, Object?>{
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
        'source': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'actionId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'simulation',
              'type': 'string',
            },
            'actionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
          },
        },
      },
    },
  ],
  'title': 'EventAssistanceGuestResponse',
};
