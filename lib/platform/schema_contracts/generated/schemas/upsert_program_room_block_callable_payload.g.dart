// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_room_block_payload.schema.json.

const schemaUpsertProgramRoomBlockCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'callables/upsert_program_room_block_payload.schema.json',
  'title': 'UpsertProgramRoomBlockCallablePayload',
  'description': 'Create or update reserved room inventory at a program hotel. Coordinator/manager only — hotelDesk consumes inventory but cannot define it. totalRooms may not be lowered below the block\'s live consuming stays.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'hotelId',
    'label',
    'totalRooms',
    'heldForGroupIds',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'roomBlockId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Existing block to update. Omit to create a new block.',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Required on updates; the write fails when the stored revision moved.',
    },
    'hotelId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Hotel the block is at. Immutable on existing blocks.',
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
      'description': 'Human label for the block (e.g. "Bride family", "Floor 3").',
    },
    'roomType': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 140,
      'description': 'Optional room class (Deluxe, Suite). Null when the block is type-agnostic.',
    },
    'totalRooms': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 500,
    },
    'heldForGroupIds': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'description': 'Guest groups this block is earmarked for; empty for general inventory.',
    },
    'startsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Block window start. Required on create; omit on update to keep the stored value.',
    },
    'endsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Block window end. Required on create; omit on update to keep the stored value.',
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'maxOccupantsPerRoom': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 20,
      'description': 'Coordinator-verified occupant limit for each contracted room. Defaults to one when unknown; does not establish bed type or accessibility.',
    },
  },
};
