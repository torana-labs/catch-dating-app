// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_hotel_rooms_response.schema.json.

const schemaProgramHotelRoomsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'callable_responses/program_hotel_rooms_response.schema.json',
  'title': 'ProgramHotelRoomsCallableResponse',
  'description': 'Hotel desk room-management view. Counts-only block capacity plus stay rows carrying display names already authorized to the caller\'s duty. Unplaced guests are program guests routed to this hotel (inbound legs or prior stays) with no capacity-consuming stay.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'hotelId',
    'hotelName',
    'accessExpiresAtMillis',
    'generatedAtMillis',
    'roomBlocks',
    'stays',
    'unplacedGuests',
  ],
  'properties': <String, Object?>{
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
    'hotelName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 200,
    },
    'accessExpiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 253402300799999,
    },
    'roomBlocks': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'roomBlockId',
          'label',
          'roomType',
          'totalRooms',
          'assignedCount',
          'remainingRooms',
          'heldForGroupIds',
          'startsAtMillis',
          'endsAtMillis',
        ],
        'properties': <String, Object?>{
          'roomBlockId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'roomType': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 140,
          },
          'totalRooms': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 500,
          },
          'assignedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 500,
          },
          'remainingRooms': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 500,
          },
          'heldForGroupIds': <String, Object?>{
            'type': 'array',
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'startsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'endsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'maxOccupantsPerRoom': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 20,
          },
        },
      },
    },
    'stays': <String, Object?>{
      'type': 'array',
      'maxItems': 2000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'stayId',
          'guestId',
          'guestDisplayName',
          'roomBlockId',
          'roomLabel',
          'status',
          'startsAtMillis',
          'endsAtMillis',
          'roomReadyAtMillis',
          'hotelArrivedAtMillis',
          'revision',
        ],
        'properties': <String, Object?>{
          'stayId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'guestDisplayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 200,
          },
          'roomBlockId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
          'roomLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 40,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'held',
              'confirmed',
              'checkedIn',
              'checkedOut',
              'cancelled',
            ],
          },
          'startsAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'endsAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'roomReadyAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'hotelArrivedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'roomOccupancyId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
      },
    },
    'unplacedGuests': <String, Object?>{
      'type': 'array',
      'maxItems': 2000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'displayName',
          'suggestedRoomBlockId',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 200,
          },
          'suggestedRoomBlockId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
            'description': 'Block the allocation policy would draw from for this guest; null when no block at this hotel has capacity.',
          },
        },
      },
    },
  },
};
