// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_stay_payload.schema.json.

const schemaUpsertProgramStayCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'callables/upsert_program_stay_payload.schema.json',
  'title': 'UpsertProgramStayCallablePayload',
  'description': 'Create or update one guest\'s stay at a hotel. hotelDesk callers may only touch stays at hotels their duty covers; program coordinators and managers are unscoped. Null fields clear the stored value; omitted fields keep it. Room-block capacity is re-counted from live stays server-side, so a stale client never overbooks.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'guestId',
    'hotelId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'stayId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Existing stay to update. Omit to create a new stay row.',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Required on updates; the write fails when the stored revision moved.',
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
      'description': 'Hotel the stay is at. Immutable on existing stays — cancel and recreate to move a guest.',
    },
    'roomBlockId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Block to draw capacity from. Null keeps/creates an ad-hoc stay outside any block. The write fails when the block has no remaining rooms.',
    },
    'roomLabel': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 40,
      'description': 'Display-only room or suite label; never used as room identity.',
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
      'description': 'Omitted on create defaults to held; on update keeps the stored status.',
    },
    'startsAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Planned check-in; null while the stay is undated.',
    },
    'endsAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Planned check-out; null while the stay is undated.',
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'markRoomReady': <String, Object?>{
      'type': 'boolean',
      'description': 'When true, stamps roomReadyAt with the server time.',
    },
    'markHotelArrived': <String, Object?>{
      'type': 'boolean',
      'description': 'When true, stamps hotelArrivedAt with the server time.',
    },
    'shareWithStayId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Explicitly join this live stay at the same hotel and block; requires its reviewed revision and verified block occupancy limit. Never inferred from labels or households.',
    },
    'shareWithStayRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'separateRoom': <String, Object?>{
      'type': 'boolean',
      'description': 'Explicitly leave a shared occupancy for a newly minted room occupancy.',
    },
  },
};
