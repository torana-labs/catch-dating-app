// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_lodging_configs.schema.json.

const schemaProgramLodgingConfigDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_lodging_configs.schema.json',
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
};
