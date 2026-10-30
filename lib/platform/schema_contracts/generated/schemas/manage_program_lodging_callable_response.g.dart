// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_program_lodging_response.schema.json.

const schemaManageProgramLodgingCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_program_lodging_response.schema.json',
  'title': 'ManageProgramLodgingCallableResponse',
  'x-callable-aliases': <Object?>[
    'manageProgramLodging',
  ],
  'description': 'Strict role-specific lodging result. Coordinator context is private; hotelBoard contains only allowlisted operational fields.',
  'type': 'object',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'programId',
        'guestId',
        'revision',
        'label',
        'groupIds',
        'groups',
        'evidence',
        'accessExpiresAtMillis',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'membership',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 140,
        },
        'groupIds': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'groups': <String, Object?>{
          'type': 'array',
          'maxItems': 240,
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
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
            },
          },
        },
        'evidence': <String, Object?>{
          'type': 'array',
          'maxItems': 200,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'assertionId',
              'groupId',
              'selected',
              'included',
              'sourceKind',
              'sourceLabel',
              'sourceVersion',
              'observedAtMillis',
            ],
            'properties': <String, Object?>{
              'assertionId': <String, Object?>{
                'type': 'string',
                'pattern': '^wma_[a-f0-9]{64}\$',
              },
              'groupId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'selected': <String, Object?>{
                'type': 'boolean',
              },
              'included': <String, Object?>{
                'type': 'boolean',
              },
              'sourceKind': <String, Object?>{
                'enum': <Object?>[
                  'manualEntry',
                  'manifestRow',
                  'contributorList',
                ],
              },
              'sourceLabel': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
              'sourceVersion': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
              'observedAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
            },
          },
        },
        'accessExpiresAtMillis': <String, Object?>{
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
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'guestId',
        'revision',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'membershipSaved',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'configuration',
        'accessExpiresAtMillis',
        'catalog',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'readSetup',
        },
        'configuration': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'title': 'ProgramLodgingConfigDocument',
              'description': 'Private event lodging setup referencing canonical program guest/group/hotel/room-block IDs. Contains explicit demand and sharing choices, exact or provisional inventory, and verified layered 2D facts; no copied contact records or public hotel catalog.',
              'x-firestore-collection': 'programLodgingConfigs',
              'x-firestore-path': 'programLodgingConfigs/{programId}',
              'x-document-id-field': 'programId',
              'x-owner': 'program lodging coordinator configuration',
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'programId',
                'organizerId',
                'revision',
                'demand',
                'parties',
                'groupParents',
                'rooms',
                'inventory',
                'labels',
              ],
              'properties': <String, Object?>{
                'programId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'x-catch-ownership': 'server-only',
                },
                'demand': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'guestId',
                      'startsAtMillis',
                      'endsAtMillis',
                      'beds',
                      'requiredFeatures',
                    ],
                    'properties': <String, Object?>{
                      'guestId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'startsAtMillis': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      'endsAtMillis': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'requiredFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                        'uniqueItems': true,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'parties': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'guestIds',
                      'confirmed',
                      'priority',
                      'requiredRoomType',
                      'pin',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'guestIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'confirmed': <String, Object?>{
                        'type': 'boolean',
                      },
                      'priority': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 1000000,
                      },
                      'requiredRoomType': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'pin': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[],
                            'properties': <String, Object?>{
                              'inventoryId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
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
                  'x-catch-ownership': 'server-only',
                },
                'groupParents': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'parentIds',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'parentIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 20,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'uniqueItems': true,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'rooms': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'hotelId',
                      'zoneId',
                      'building',
                      'floor',
                      'wing',
                      'roomType',
                      'beds',
                      'maxOccupants',
                      'verifiedFeatures',
                      'resourceIds',
                      'position',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'hotelId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'zoneId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'building': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'floor': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'wing': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'roomType': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'maxOccupants': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'verifiedFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                        'uniqueItems': true,
                      },
                      'resourceIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'position': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'x',
                              'y',
                            ],
                            'properties': <String, Object?>{
                              'x': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
                              },
                              'y': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
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
                  'x-catch-ownership': 'server-only',
                },
                'inventory': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'contractId',
                      'physicalRoomId',
                      'provisional',
                      'availability',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'contractId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'physicalRoomId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'x-catch-ownership': 'server-only',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'provisional': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'hotelId',
                              'zoneId',
                              'building',
                              'floor',
                              'wing',
                              'roomType',
                              'beds',
                              'maxOccupants',
                              'verifiedFeatures',
                            ],
                            'properties': <String, Object?>{
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'building': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'floor': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'wing': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'roomType': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'beds': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'maxOccupants': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'verifiedFeatures': <String, Object?>{
                                'type': 'array',
                                'maxItems': 30,
                                'items': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 80,
                                },
                                'uniqueItems': true,
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'availability': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'arrival',
                            'departure',
                          ],
                          'properties': <String, Object?>{
                            'arrival': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                            'departure': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                          },
                        },
                        'minItems': 1,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'labels': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'inventoryId',
                      'roomLabel',
                    ],
                    'properties': <String, Object?>{
                      'inventoryId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'roomLabel': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 40,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'accessExpiresAtMillis': <String, Object?>{
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
        'catalog': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'programId',
            'organizerId',
            'timezone',
            'guests',
            'groups',
            'hotels',
            'contracts',
            'activeStays',
            'calendarDates',
          ],
          'properties': <String, Object?>{
            'programId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'timezone': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'guests': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'label',
                  'householdId',
                  'groupIds',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                  'householdId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'groupIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                  },
                },
              },
            },
            'groups': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
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
                    'maxLength': 180,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                },
              },
            },
            'hotels': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'label',
                  'active',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                  'active': <String, Object?>{
                    'type': 'boolean',
                  },
                },
              },
            },
            'contracts': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'hotelId',
                  'label',
                  'roomType',
                  'totalRooms',
                  'maxOccupantsPerRoom',
                  'startsAtMillis',
                  'endsAtMillis',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'hotelId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                  'roomType': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'maxLength': 80,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'totalRooms': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 500,
                  },
                  'maxOccupantsPerRoom': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 100,
                  },
                  'startsAtMillis': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 8640000000000000,
                  },
                  'endsAtMillis': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 8640000000000000,
                  },
                },
              },
            },
            'activeStays': <String, Object?>{
              'type': 'array',
              'maxItems': 2000,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'guestId',
                  'hotelId',
                  'roomBlockId',
                  'roomLabel',
                  'roomOccupancyId',
                  'lodgingPartyId',
                  'lodgingInventoryId',
                  'startsAtMillis',
                  'endsAtMillis',
                  'status',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'guestId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'hotelId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'roomBlockId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'roomLabel': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'maxLength': 80,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'roomOccupancyId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'lodgingPartyId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'lodgingInventoryId': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'startsAtMillis': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'endsAtMillis': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'status': <String, Object?>{
                    'enum': <Object?>[
                      'held',
                      'confirmed',
                      'checkedIn',
                    ],
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                },
              },
            },
            'calendarDates': <String, Object?>{
              'type': 'object',
              'maxProperties': 6000,
              'propertyNames': <String, Object?>{
                'pattern': '^[0-9]+\$',
              },
              'additionalProperties': <String, Object?>{
                'type': 'string',
                'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
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
        'revision',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'setup',
        },
        'revision': <String, Object?>{
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
        'proposal',
        'context',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'proposal',
        },
        'proposal': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'scope',
            'id',
            'revisions',
            'placements',
            'unplacedPartyIds',
            'explanations',
            'score',
            'search',
          ],
          'properties': <String, Object?>{
            'scope': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'programId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'programId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            'id': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'revisions': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'source',
                'inventory',
                'layout',
                'published',
              ],
              'properties': <String, Object?>{
                'source': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'inventory': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'layout': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'published': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            'placements': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'partyId',
                  'inventoryId',
                ],
                'properties': <String, Object?>{
                  'partyId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'x-catch-ownership': 'server-only',
                  },
                  'inventoryId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'x-catch-ownership': 'server-only',
                  },
                },
              },
            },
            'unplacedPartyIds': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'x-catch-ownership': 'server-only',
              },
            },
            'explanations': <String, Object?>{
              'type': 'array',
              'maxItems': 502,
              'items': <String, Object?>{
                'type': 'string',
                'maxLength': 2000,
              },
            },
            'score': <String, Object?>{
              'type': 'array',
              'minItems': 5,
              'maxItems': 5,
              'items': <String, Object?>{
                'type': 'number',
                'minimum': 0,
              },
            },
            'search': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'complete',
                'explored',
              ],
              'properties': <String, Object?>{
                'complete': <String, Object?>{
                  'type': 'boolean',
                },
                'explored': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'x-catch-ownership': 'server-only',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'snapshot',
            'configuration',
            'labels',
            'workflow',
            'accessExpiresAtMillis',
          ],
          'properties': <String, Object?>{
            'snapshot': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'scope',
                'revisions',
                'guests',
                'parties',
                'groups',
                'memberships',
                'rooms',
                'contracts',
                'inventory',
                'published',
              ],
              'properties': <String, Object?>{
                'scope': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'programId',
                    'organizerId',
                  ],
                  'properties': <String, Object?>{
                    'programId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'organizerId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                  },
                },
                'revisions': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'source',
                    'inventory',
                    'layout',
                    'published',
                  ],
                  'properties': <String, Object?>{
                    'source': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'inventory': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'layout': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'published': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
                'guests': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'arrival',
                      'departure',
                      'beds',
                      'requiredFeatures',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'arrival': <String, Object?>{
                        'type': 'string',
                        'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                      },
                      'departure': <String, Object?>{
                        'type': 'string',
                        'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'requiredFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                      },
                    },
                  },
                },
                'parties': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'guestIds',
                      'confirmed',
                      'priority',
                      'requiredRoomType',
                      'pin',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'guestIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'confirmed': <String, Object?>{
                        'type': 'boolean',
                      },
                      'priority': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 1000000,
                      },
                      'requiredRoomType': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'pin': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[],
                            'properties': <String, Object?>{
                              'inventoryId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
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
                  'x-catch-ownership': 'server-only',
                },
                'groups': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'parentIds',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'parentIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 20,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'uniqueItems': true,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'memberships': <String, Object?>{
                  'type': 'array',
                  'maxItems': 10000,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'guestId',
                      'groupId',
                      'included',
                      'authority',
                      'sourceId',
                    ],
                    'properties': <String, Object?>{
                      'guestId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'groupId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'included': <String, Object?>{
                        'type': 'boolean',
                      },
                      'authority': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'canonical',
                          'manual',
                          'acceptedSuggestion',
                        ],
                      },
                      'sourceId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                },
                'rooms': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'hotelId',
                      'zoneId',
                      'building',
                      'floor',
                      'wing',
                      'roomType',
                      'beds',
                      'maxOccupants',
                      'verifiedFeatures',
                      'resourceIds',
                      'position',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'hotelId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'zoneId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'building': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'floor': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'wing': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'roomType': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'maxOccupants': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'verifiedFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                        'uniqueItems': true,
                      },
                      'resourceIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'position': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'x',
                              'y',
                            ],
                            'properties': <String, Object?>{
                              'x': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
                              },
                              'y': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
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
                  'x-catch-ownership': 'server-only',
                },
                'contracts': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'hotelId',
                      'arrival',
                      'departure',
                      'nightlyRoomQuota',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'hotelId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'arrival': <String, Object?>{
                        'type': 'string',
                        'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                      },
                      'departure': <String, Object?>{
                        'type': 'string',
                        'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                      },
                      'nightlyRoomQuota': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000000,
                      },
                    },
                  },
                },
                'inventory': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'contractId',
                      'physicalRoomId',
                      'provisional',
                      'availability',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'contractId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'physicalRoomId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'x-catch-ownership': 'server-only',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'provisional': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'hotelId',
                              'zoneId',
                              'building',
                              'floor',
                              'wing',
                              'roomType',
                              'beds',
                              'maxOccupants',
                              'verifiedFeatures',
                            ],
                            'properties': <String, Object?>{
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'building': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'floor': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'wing': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'roomType': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'beds': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'maxOccupants': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'verifiedFeatures': <String, Object?>{
                                'type': 'array',
                                'maxItems': 30,
                                'items': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 80,
                                },
                                'uniqueItems': true,
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'availability': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'arrival',
                            'departure',
                          ],
                          'properties': <String, Object?>{
                            'arrival': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                            'departure': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                          },
                        },
                        'minItems': 1,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'published': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'partyId',
                      'inventoryId',
                      'locked',
                      'checkedIn',
                    ],
                    'properties': <String, Object?>{
                      'partyId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'inventoryId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'locked': <String, Object?>{
                        'type': 'boolean',
                      },
                      'checkedIn': <String, Object?>{
                        'type': 'boolean',
                      },
                    },
                  },
                },
              },
            },
            'configuration': <String, Object?>{
              'title': 'ProgramLodgingConfigDocument',
              'description': 'Private event lodging setup referencing canonical program guest/group/hotel/room-block IDs. Contains explicit demand and sharing choices, exact or provisional inventory, and verified layered 2D facts; no copied contact records or public hotel catalog.',
              'x-firestore-collection': 'programLodgingConfigs',
              'x-firestore-path': 'programLodgingConfigs/{programId}',
              'x-document-id-field': 'programId',
              'x-owner': 'program lodging coordinator configuration',
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'programId',
                'organizerId',
                'revision',
                'demand',
                'parties',
                'groupParents',
                'rooms',
                'inventory',
                'labels',
              ],
              'properties': <String, Object?>{
                'programId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'x-catch-ownership': 'server-only',
                },
                'demand': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'guestId',
                      'startsAtMillis',
                      'endsAtMillis',
                      'beds',
                      'requiredFeatures',
                    ],
                    'properties': <String, Object?>{
                      'guestId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'startsAtMillis': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      'endsAtMillis': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 8640000000000000,
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'requiredFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                        'uniqueItems': true,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'parties': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'guestIds',
                      'confirmed',
                      'priority',
                      'requiredRoomType',
                      'pin',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'guestIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'confirmed': <String, Object?>{
                        'type': 'boolean',
                      },
                      'priority': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 1000000,
                      },
                      'requiredRoomType': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'pin': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[],
                            'properties': <String, Object?>{
                              'inventoryId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
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
                  'x-catch-ownership': 'server-only',
                },
                'groupParents': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'parentIds',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'parentIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 20,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'uniqueItems': true,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'rooms': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'hotelId',
                      'zoneId',
                      'building',
                      'floor',
                      'wing',
                      'roomType',
                      'beds',
                      'maxOccupants',
                      'verifiedFeatures',
                      'resourceIds',
                      'position',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'hotelId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'zoneId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'building': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'floor': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'wing': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'roomType': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'beds': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'maxOccupants': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 100,
                      },
                      'verifiedFeatures': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 80,
                        },
                        'uniqueItems': true,
                      },
                      'resourceIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                          'x-catch-ownership': 'server-only',
                        },
                        'minItems': 1,
                        'uniqueItems': true,
                      },
                      'position': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'x',
                              'y',
                            ],
                            'properties': <String, Object?>{
                              'x': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
                              },
                              'y': <String, Object?>{
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 1,
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
                  'x-catch-ownership': 'server-only',
                },
                'inventory': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'id',
                      'contractId',
                      'physicalRoomId',
                      'provisional',
                      'availability',
                    ],
                    'properties': <String, Object?>{
                      'id': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'contractId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'physicalRoomId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                            'x-catch-ownership': 'server-only',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'provisional': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'object',
                            'additionalProperties': false,
                            'required': <Object?>[
                              'hotelId',
                              'zoneId',
                              'building',
                              'floor',
                              'wing',
                              'roomType',
                              'beds',
                              'maxOccupants',
                              'verifiedFeatures',
                            ],
                            'properties': <String, Object?>{
                              'hotelId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'zoneId': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 180,
                                'x-catch-ownership': 'server-only',
                              },
                              'building': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'floor': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'wing': <String, Object?>{
                                'type': <Object?>[
                                  'string',
                                  'null',
                                ],
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'roomType': <String, Object?>{
                                'type': 'string',
                                'minLength': 1,
                                'maxLength': 80,
                              },
                              'beds': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'maxOccupants': <String, Object?>{
                                'type': 'integer',
                                'minimum': 1,
                                'maximum': 100,
                              },
                              'verifiedFeatures': <String, Object?>{
                                'type': 'array',
                                'maxItems': 30,
                                'items': <String, Object?>{
                                  'type': 'string',
                                  'minLength': 1,
                                  'maxLength': 80,
                                },
                                'uniqueItems': true,
                              },
                            },
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      'availability': <String, Object?>{
                        'type': 'array',
                        'maxItems': 30,
                        'items': <String, Object?>{
                          'type': 'object',
                          'additionalProperties': false,
                          'required': <Object?>[
                            'arrival',
                            'departure',
                          ],
                          'properties': <String, Object?>{
                            'arrival': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                            'departure': <String, Object?>{
                              'type': 'string',
                              'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                            },
                          },
                        },
                        'minItems': 1,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
                'labels': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'inventoryId',
                      'roomLabel',
                    ],
                    'properties': <String, Object?>{
                      'inventoryId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                        'x-catch-ownership': 'server-only',
                      },
                      'roomLabel': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'minLength': 1,
                        'maxLength': 40,
                      },
                    },
                  },
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            'labels': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'guests',
                'groups',
                'hotels',
              ],
              'properties': <String, Object?>{
                'guests': <String, Object?>{
                  'type': 'object',
                  'maxProperties': 500,
                  'additionalProperties': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                },
                'groups': <String, Object?>{
                  'type': 'object',
                  'maxProperties': 500,
                  'additionalProperties': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                },
                'hotels': <String, Object?>{
                  'type': 'object',
                  'maxProperties': 500,
                  'additionalProperties': <String, Object?>{
                    'type': 'string',
                    'maxLength': 200,
                  },
                },
              },
            },
            'workflow': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'revision',
                'approvedProposalId',
                'confirmedHotelIds',
                'guestPublishedProposalId',
              ],
              'properties': <String, Object?>{
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'approvedProposalId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'confirmedHotelIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 500,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'x-catch-ownership': 'server-only',
                  },
                  'uniqueItems': true,
                },
                'guestPublishedProposalId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
              'x-catch-ownership': 'server-only',
            },
            'accessExpiresAtMillis': <String, Object?>{
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
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'revisions',
        'destinations',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'destinations',
        },
        'revisions': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'source',
            'inventory',
            'layout',
            'published',
          ],
          'properties': <String, Object?>{
            'source': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'inventory': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'layout': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'published': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
        'destinations': <String, Object?>{
          'type': 'array',
          'maxItems': 500,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'inventoryId',
              'allowed',
              'explanation',
            ],
            'properties': <String, Object?>{
              'inventoryId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'allowed': <String, Object?>{
                'type': 'boolean',
              },
              'explanation': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
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
        'proposal',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'saved',
        },
        'proposal': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'scope',
            'id',
            'revisions',
            'placements',
            'unplacedPartyIds',
            'explanations',
            'score',
            'search',
          ],
          'properties': <String, Object?>{
            'scope': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'programId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'programId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            'id': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'revisions': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'source',
                'inventory',
                'layout',
                'published',
              ],
              'properties': <String, Object?>{
                'source': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'inventory': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'layout': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'published': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            'placements': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'partyId',
                  'inventoryId',
                ],
                'properties': <String, Object?>{
                  'partyId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'x-catch-ownership': 'server-only',
                  },
                  'inventoryId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'x-catch-ownership': 'server-only',
                  },
                },
              },
            },
            'unplacedPartyIds': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'x-catch-ownership': 'server-only',
              },
            },
            'explanations': <String, Object?>{
              'type': 'array',
              'maxItems': 502,
              'items': <String, Object?>{
                'type': 'string',
                'maxLength': 2000,
              },
            },
            'score': <String, Object?>{
              'type': 'array',
              'minItems': 5,
              'maxItems': 5,
              'items': <String, Object?>{
                'type': 'number',
                'minimum': 0,
              },
            },
            'search': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'complete',
                'explored',
              ],
              'properties': <String, Object?>{
                'complete': <String, Object?>{
                  'type': 'boolean',
                },
                'explored': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'x-catch-ownership': 'server-only',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'workflow',
        'receipt',
        'replayed',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'transition',
        },
        'workflow': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'approvedProposalId',
            'confirmedHotelIds',
            'guestPublishedProposalId',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'approvedProposalId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'pattern': '^[a-f0-9]{64}\$',
            },
            'confirmedHotelIds': <String, Object?>{
              'type': 'array',
              'maxItems': 500,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'x-catch-ownership': 'server-only',
              },
              'uniqueItems': true,
            },
            'guestPublishedProposalId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
          'x-catch-ownership': 'server-only',
        },
        'receipt': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'operationId',
            'requestHash',
            'actorUid',
            'resultingRevision',
          ],
          'properties': <String, Object?>{
            'operationId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,100}\$',
            },
            'requestHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'actorUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'x-catch-ownership': 'server-only',
            },
            'resultingRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
              'x-catch-ownership': 'server-only',
            },
          },
          'x-catch-ownership': 'server-only',
        },
        'replayed': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'rows',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'hotelBoard',
        },
        'rows': <String, Object?>{
          'type': 'array',
          'maxItems': 500,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'partyId',
              'inventoryId',
              'physicalRoomId',
              'zoneId',
              'roomType',
              'guests',
            ],
            'properties': <String, Object?>{
              'partyId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'inventoryId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'physicalRoomId': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'zoneId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'roomType': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'guests': <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'guestId',
                    'arrival',
                    'departure',
                  ],
                  'properties': <String, Object?>{
                    'guestId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'arrival': <String, Object?>{
                      'type': 'string',
                      'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
                    },
                    'departure': <String, Object?>{
                      'type': 'string',
                      'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
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
        'timezone',
        'arrival',
        'departure',
        'startsAtMillis',
        'endsAtMillis',
        'accessExpiresAtMillis',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'resolvedDates',
        },
        'timezone': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'arrival': <String, Object?>{
          'type': 'string',
          'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
        },
        'departure': <String, Object?>{
          'type': 'string',
          'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
        },
        'startsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 8640000000000000,
        },
        'endsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 8640000000000000,
        },
        'accessExpiresAtMillis': <String, Object?>{
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
};
