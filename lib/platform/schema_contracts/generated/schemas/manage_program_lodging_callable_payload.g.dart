// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_program_lodging_payload.schema.json.

const schemaManageProgramLodgingCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_program_lodging_payload.schema.json',
  'title': 'ManageProgramLodgingCallablePayload',
  'description': 'Authenticated private lodging commands. Current authority comes from the session and canonical program documents, never this payload. Hotel desk may request only its scoped operational board/confirmation.',
  'type': 'object',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'guestId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'readMembership',
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
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'guestId',
        'expectedRevision',
        'groupIds',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'decideMembership',
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
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
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
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'readSetup',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'setup',
        'expectedConfigurationRevision',
        'adoptions',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'setup',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'setup': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'demand',
            'parties',
            'groupParents',
            'rooms',
            'inventory',
            'labels',
          ],
          'properties': <String, Object?>{
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
        'expectedConfigurationRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'adoptions': <String, Object?>{
          'type': 'array',
          'maxItems': 200,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'stayId',
              'partyId',
              'inventoryId',
              'expectedRevision',
            ],
            'properties': <String, Object?>{
              'stayId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
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
              'expectedRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
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
        'action',
        'programId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'preview',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'regenerate': <String, Object?>{
          'type': 'boolean',
          'description': 'Explicitly generate a new current candidate instead of retaining a compatible approved proposal.',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'placements',
        'expectedRevisions',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'propose',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
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
        'expectedRevisions': <String, Object?>{
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
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'placements',
        'expectedRevisions',
        'partyId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'destinations',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
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
        'expectedRevisions': <String, Object?>{
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
        'partyId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'proposal',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'save',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
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
        'action',
        'programId',
        'command',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'transition',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'command': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'proposalId',
            'operationId',
            'expectedWorkflowRevision',
            'action',
            'hotelId',
          ],
          'properties': <String, Object?>{
            'proposalId': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'operationId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{1,100}\$',
            },
            'expectedWorkflowRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'action': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'approve',
                'confirmHotel',
                'publishGuests',
              ],
            },
            'hotelId': <String, Object?>{
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
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'hotelId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'hotelBoard',
        },
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'hotelId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'programId',
        'arrival',
        'departure',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'resolveDates',
        },
        'programId': <String, Object?>{
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
  ],
};
