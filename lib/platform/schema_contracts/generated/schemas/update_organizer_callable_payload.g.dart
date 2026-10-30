// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_organizer_payload.schema.json.

const schemaUpdateOrganizerCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_organizer_payload.schema.json',
  'title': 'UpdateOrganizerCallablePayload',
  'description': 'Callable payload accepted by updateOrganizer.',
  'x-callable-shape': 'patch',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'fields',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'description': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'location': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'area': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'organizerType': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'club',
            'community',
            'individual',
            'eventProducer',
            'venue',
            'brand',
          ],
          'description': 'Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.',
        },
        'hostName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'hostAvatarUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'imageUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'profileImageUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'organizerPhotos': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'title': 'UploadedPhoto',
            'description': 'Canonical uploaded image object for ordered media galleries, logos, and event photos.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'url',
              'storagePath',
              'thumbnailUrl',
              'thumbnailStoragePath',
              'position',
              'createdAt',
              'updatedAt',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
                'pattern': '^[A-Za-z0-9_-]+\$',
              },
              'url': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 2048,
              },
              'storagePath': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 512,
                'pattern': '^[^/\\u0000][^\\u0000]*\$',
              },
              'thumbnailUrl': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'uri',
                    'maxLength': 2048,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'thumbnailStoragePath': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 512,
                    'pattern': '^[^/\\u0000][^\\u0000]*\$',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'position': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'moderation': <String, Object?>{
                'type': <Object?>[
                  'object',
                  'null',
                ],
                'additionalProperties': false,
                'required': <Object?>[
                  'status',
                ],
                'properties': <String, Object?>{
                  'status': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'pending',
                      'approved',
                      'rejected',
                    ],
                  },
                  'reason': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 240,
                  },
                  'reviewedAt': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'object',
                        'description': 'Serialized Firestore Timestamp fixture shape.',
                        'x-firestore-type': 'timestamp',
                        'additionalProperties': false,
                        'required': <Object?>[
                          '_seconds',
                          '_nanoseconds',
                        ],
                        'properties': <String, Object?>{
                          '_seconds': <String, Object?>{
                            'type': 'integer',
                          },
                          '_nanoseconds': <String, Object?>{
                            'type': 'integer',
                            'minimum': 0,
                            'maximum': 999999999,
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
              'createdAt': <String, Object?>{
                'type': 'object',
                'description': 'Serialized Firestore Timestamp fixture shape.',
                'x-firestore-type': 'timestamp',
                'additionalProperties': false,
                'required': <Object?>[
                  '_seconds',
                  '_nanoseconds',
                ],
                'properties': <String, Object?>{
                  '_seconds': <String, Object?>{
                    'type': 'integer',
                  },
                  '_nanoseconds': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 999999999,
                  },
                },
              },
              'updatedAt': <String, Object?>{
                'type': 'object',
                'description': 'Serialized Firestore Timestamp fixture shape.',
                'x-firestore-type': 'timestamp',
                'additionalProperties': false,
                'required': <Object?>[
                  '_seconds',
                  '_nanoseconds',
                ],
                'properties': <String, Object?>{
                  '_seconds': <String, Object?>{
                    'type': 'integer',
                  },
                  '_nanoseconds': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 999999999,
                  },
                },
              },
            },
            'definitions': <String, Object?>{
              'storageObjectPath': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 512,
                'pattern': '^[^/\\u0000][^\\u0000]*\$',
              },
            },
          },
        },
        'logoPhoto': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'title': 'UploadedPhoto',
              'description': 'Canonical uploaded image object for ordered media galleries, logos, and event photos.',
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'id',
                'url',
                'storagePath',
                'thumbnailUrl',
                'thumbnailStoragePath',
                'position',
                'createdAt',
                'updatedAt',
              ],
              'properties': <String, Object?>{
                'id': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                  'pattern': '^[A-Za-z0-9_-]+\$',
                },
                'url': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                  'maxLength': 2048,
                },
                'storagePath': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                  'pattern': '^[^/\\u0000][^\\u0000]*\$',
                },
                'thumbnailUrl': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'format': 'uri',
                      'maxLength': 2048,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'thumbnailStoragePath': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                      'pattern': '^[^/\\u0000][^\\u0000]*\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'position': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'moderation': <String, Object?>{
                  'type': <Object?>[
                    'object',
                    'null',
                  ],
                  'additionalProperties': false,
                  'required': <Object?>[
                    'status',
                  ],
                  'properties': <String, Object?>{
                    'status': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'pending',
                        'approved',
                        'rejected',
                      ],
                    },
                    'reason': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 240,
                    },
                    'reviewedAt': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'description': 'Serialized Firestore Timestamp fixture shape.',
                          'x-firestore-type': 'timestamp',
                          'additionalProperties': false,
                          'required': <Object?>[
                            '_seconds',
                            '_nanoseconds',
                          ],
                          'properties': <String, Object?>{
                            '_seconds': <String, Object?>{
                              'type': 'integer',
                            },
                            '_nanoseconds': <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 999999999,
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
                'createdAt': <String, Object?>{
                  'type': 'object',
                  'description': 'Serialized Firestore Timestamp fixture shape.',
                  'x-firestore-type': 'timestamp',
                  'additionalProperties': false,
                  'required': <Object?>[
                    '_seconds',
                    '_nanoseconds',
                  ],
                  'properties': <String, Object?>{
                    '_seconds': <String, Object?>{
                      'type': 'integer',
                    },
                    '_nanoseconds': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 999999999,
                    },
                  },
                },
                'updatedAt': <String, Object?>{
                  'type': 'object',
                  'description': 'Serialized Firestore Timestamp fixture shape.',
                  'x-firestore-type': 'timestamp',
                  'additionalProperties': false,
                  'required': <Object?>[
                    '_seconds',
                    '_nanoseconds',
                  ],
                  'properties': <String, Object?>{
                    '_seconds': <String, Object?>{
                      'type': 'integer',
                    },
                    '_nanoseconds': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 999999999,
                    },
                  },
                },
              },
              'definitions': <String, Object?>{
                'storageObjectPath': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                  'pattern': '^[^/\\u0000][^\\u0000]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'tags': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
          'maxItems': 12,
          'uniqueItems': true,
        },
        'instagramHandle': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'phoneNumber': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'hostDefaults': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'primaryActivityKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'socialRun',
                'running',
                'walking',
                'pickleball',
                'padel',
                'tennis',
                'badminton',
                'cycling',
                'spinClass',
                'yoga',
                'strengthTraining',
                'pubQuiz',
                'barCrawl',
                'dinner',
                'singlesMixer',
                'openActivity',
              ],
            },
            'supportedActivityKinds': <String, Object?>{
              'type': 'array',
              'maxItems': 16,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'socialRun',
                  'running',
                  'walking',
                  'pickleball',
                  'padel',
                  'tennis',
                  'badminton',
                  'cycling',
                  'spinClass',
                  'yoga',
                  'strengthTraining',
                  'pubQuiz',
                  'barCrawl',
                  'dinner',
                  'singlesMixer',
                  'openActivity',
                ],
              },
            },
            'eventPolicy': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'admissionPreset': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'openCapacity',
                    'inviteOnly',
                    'balancedSingles',
                    'fixedCohortCaps',
                  ],
                },
                'minAge': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 120,
                },
                'maxAge': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 120,
                },
                'maxMen': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 0,
                },
                'maxWomen': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 0,
                },
                'dynamicPricingEnabled': <String, Object?>{
                  'type': 'boolean',
                },
                'crossPathsPairCapacity': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 100,
                },
                'dynamicPricingStepInPaise': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 100000000,
                },
                'dynamicPricingMaxInPaise': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 100000000,
                },
                'cancellationPolicyId': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'flexible',
                    'standard',
                    'strict',
                  ],
                },
              },
            },
            'eventSuccess': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'properties': <String, Object?>{
                'enabled': <String, Object?>{
                  'type': 'boolean',
                },
                'layoutId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
                },
                'playbookId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'selectedModuleIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 24,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                },
                'moduleSelectionConfigured': <String, Object?>{
                  'type': 'boolean',
                },
                'structureConfig': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'unitKind',
                    'unitSize',
                    'revealCountdownSeconds',
                  ],
                  'properties': <String, Object?>{
                    'unitKind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'wholeGroup',
                        'pods',
                        'pairs',
                        'teams',
                        'tables',
                      ],
                    },
                    'unitSize': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 1000,
                    },
                    'unitCount': <String, Object?>{
                      'type': <Object?>[
                        'integer',
                        'null',
                      ],
                      'minimum': 1,
                      'maximum': 200,
                    },
                    'rotationIntervalMinutes': <String, Object?>{
                      'type': <Object?>[
                        'integer',
                        'null',
                      ],
                      'minimum': 5,
                      'maximum': 180,
                    },
                    'topology': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'set',
                        'sequence',
                        'adjacency',
                      ],
                    },
                    'resourceCapacity': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'concurrentUnits',
                            'resourceLabelId',
                            'seatsPerUnit',
                          ],
                          'properties': <String, Object?>{
                            'concurrentUnits': <String, Object?>{
                              'type': <Object?>[
                                'integer',
                                'null',
                              ],
                              'minimum': 1,
                              'maximum': 200,
                            },
                            'resourceLabelId': <String, Object?>{
                              'type': 'string',
                              'enum': <Object?>[
                                'court',
                                'table',
                                'lane',
                                'board',
                              ],
                            },
                            'seatsPerUnit': <String, Object?>{
                              'type': <Object?>[
                                'integer',
                                'null',
                              ],
                              'minimum': 1,
                              'maximum': 1000,
                            },
                          },
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'revealCountdownSeconds': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 60,
                    },
                    'rotationRepeatStrategy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'avoid',
                        'allowWhenExhausted',
                      ],
                    },
                    'maxPairMeetings': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 10,
                    },
                    'balanceActivityAttributes': <String, Object?>{
                      'type': 'array',
                      'maxItems': 8,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'paceBand',
                          'skillBand',
                          'roleBand',
                        ],
                      },
                    },
                    'clusterActivityAttributes': <String, Object?>{
                      'type': 'array',
                      'maxItems': 8,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'paceBand',
                          'skillBand',
                          'roleBand',
                        ],
                      },
                    },
                  },
                  'allOf': <Object?>[
                    <String, Object?>{
                      'if': <String, Object?>{
                        'required': <Object?>[
                          'resourceCapacity',
                        ],
                        'properties': <String, Object?>{
                          'resourceCapacity': <String, Object?>{
                            'type': 'object',
                            'required': <Object?>[
                              'seatsPerUnit',
                            ],
                            'properties': <String, Object?>{
                              'seatsPerUnit': <String, Object?>{
                                'type': 'integer',
                              },
                            },
                          },
                        },
                      },
                      'then': <String, Object?>{
                        'required': <Object?>[
                          'topology',
                        ],
                        'properties': <String, Object?>{
                          'topology': <String, Object?>{
                            'const': 'adjacency',
                          },
                        },
                      },
                    },
                  ],
                },
                'hostGoal': <String, Object?>{
                  'type': 'string',
                  'maxLength': 300,
                },
                'wingmanRequestsEnabled': <String, Object?>{
                  'type': 'boolean',
                },
                'contextualOpenersEnabled': <String, Object?>{
                  'type': 'boolean',
                },
                'compatibilityAffectsRanking': <String, Object?>{
                  'type': 'boolean',
                },
                'questionnaireConfig': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'templateId',
                  ],
                  'properties': <String, Object?>{
                    'templateId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 120,
                    },
                    'customTitle': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 80,
                    },
                    'customQuestions': <String, Object?>{
                      'type': 'array',
                      'maxItems': 8,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'id',
                          'prompt',
                          'options',
                        ],
                        'properties': <String, Object?>{
                          'id': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 120,
                          },
                          'prompt': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 140,
                          },
                          'options': <String, Object?>{
                            'type': 'array',
                            'minItems': 2,
                            'maxItems': 5,
                            'items': <String, Object?>{
                              'type': 'object',
                              'additionalProperties': false,
                              'required': <Object?>[
                                'id',
                                'label',
                              ],
                              'properties': <String, Object?>{
                                'id': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 120,
                                },
                                'label': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 80,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                'attendeePrompt': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 300,
                },
              },
            },
            'eventSuccessByActivityKind': <String, Object?>{
              'type': 'object',
              'maxProperties': 16,
              'additionalProperties': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'enabled': <String, Object?>{
                    'type': 'boolean',
                  },
                  'layoutId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
                  },
                  'playbookId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                  'selectedModuleIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 24,
                    'items': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 120,
                    },
                  },
                  'moduleSelectionConfigured': <String, Object?>{
                    'type': 'boolean',
                  },
                  'structureConfig': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'unitKind',
                      'unitSize',
                      'revealCountdownSeconds',
                    ],
                    'properties': <String, Object?>{
                      'unitKind': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'wholeGroup',
                          'pods',
                          'pairs',
                          'teams',
                          'tables',
                        ],
                      },
                      'unitSize': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000,
                      },
                      'unitCount': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 1,
                        'maximum': 200,
                      },
                      'rotationIntervalMinutes': <String, Object?>{
                        'type': <Object?>[
                          'integer',
                          'null',
                        ],
                        'minimum': 5,
                        'maximum': 180,
                      },
                      'topology': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'set',
                          'sequence',
                          'adjacency',
                        ],
                      },
                      'resourceCapacity': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'concurrentUnits',
                              'resourceLabelId',
                              'seatsPerUnit',
                            ],
                            'properties': <String, Object?>{
                              'concurrentUnits': <String, Object?>{
                                'type': <Object?>[
                                  'integer',
                                  'null',
                                ],
                                'minimum': 1,
                                'maximum': 200,
                              },
                              'resourceLabelId': <String, Object?>{
                                'type': 'string',
                                'enum': <Object?>[
                                  'court',
                                  'table',
                                  'lane',
                                  'board',
                                ],
                              },
                              'seatsPerUnit': <String, Object?>{
                                'type': <Object?>[
                                  'integer',
                                  'null',
                                ],
                                'minimum': 1,
                                'maximum': 1000,
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'revealCountdownSeconds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 60,
                      },
                      'rotationRepeatStrategy': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'avoid',
                          'allowWhenExhausted',
                        ],
                      },
                      'maxPairMeetings': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 10,
                      },
                      'balanceActivityAttributes': <String, Object?>{
                        'type': 'array',
                        'maxItems': 8,
                        'uniqueItems': true,
                        'items': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'paceBand',
                            'skillBand',
                            'roleBand',
                          ],
                        },
                      },
                      'clusterActivityAttributes': <String, Object?>{
                        'type': 'array',
                        'maxItems': 8,
                        'uniqueItems': true,
                        'items': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'paceBand',
                            'skillBand',
                            'roleBand',
                          ],
                        },
                      },
                    },
                    'allOf': <Object?>[
                      <String, Object?>{
                        'if': <String, Object?>{
                          'required': <Object?>[
                            'resourceCapacity',
                          ],
                          'properties': <String, Object?>{
                            'resourceCapacity': <String, Object?>{
                              'type': 'object',
                              'required': <Object?>[
                                'seatsPerUnit',
                              ],
                              'properties': <String, Object?>{
                                'seatsPerUnit': <String, Object?>{
                                  'type': 'integer',
                                },
                              },
                            },
                          },
                        },
                        'then': <String, Object?>{
                          'required': <Object?>[
                            'topology',
                          ],
                          'properties': <String, Object?>{
                            'topology': <String, Object?>{
                              'const': 'adjacency',
                            },
                          },
                        },
                      },
                    ],
                  },
                  'hostGoal': <String, Object?>{
                    'type': 'string',
                    'maxLength': 300,
                  },
                  'wingmanRequestsEnabled': <String, Object?>{
                    'type': 'boolean',
                  },
                  'contextualOpenersEnabled': <String, Object?>{
                    'type': 'boolean',
                  },
                  'compatibilityAffectsRanking': <String, Object?>{
                    'type': 'boolean',
                  },
                  'questionnaireConfig': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'templateId',
                    ],
                    'properties': <String, Object?>{
                      'templateId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 120,
                      },
                      'customTitle': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 80,
                      },
                      'customQuestions': <String, Object?>{
                        'type': 'array',
                        'maxItems': 8,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'id',
                            'prompt',
                            'options',
                          ],
                          'properties': <String, Object?>{
                            'id': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 120,
                            },
                            'prompt': <String, Object?>{
                              'type': 'string',
                              'minLength': 1,
                              'maxLength': 140,
                            },
                            'options': <String, Object?>{
                              'type': 'array',
                              'minItems': 2,
                              'maxItems': 5,
                              'items': <String, Object?>{
                                'type': 'object',
                                'additionalProperties': false,
                                'required': <Object?>[
                                  'id',
                                  'label',
                                ],
                                'properties': <String, Object?>{
                                  'id': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 120,
                                  },
                                  'label': <String, Object?>{
                                    'type': 'string',
                                    'minLength': 1,
                                    'maxLength': 80,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  'attendeePrompt': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 300,
                  },
                },
              },
            },
          },
        },
        'publicListingEnabled': <String, Object?>{
          'type': 'boolean',
          'description': 'Owner-controlled value-ladder switch. The callable maps this intent to app visibility and governed public-page publication/index fields.',
        },
      },
    },
  },
};
