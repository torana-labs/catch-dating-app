// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_room_blocks.schema.json.

const schemaProgramRoomBlockDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_room_blocks.schema.json',
  'title': 'ProgramRoomBlockDocument',
  'description': 'Server-owned reserved room inventory at a programHotels doc — a labelled block of rooms held for a stay window, optionally earmarked for guest groups. Stays consume capacity through roomBlockId; assignedCount is the server-maintained rollup.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programRoomBlocks',
  'x-firestore-path': 'programRoomBlocks/{roomBlockId}',
  'x-document-id-field': 'roomBlockId',
  'x-owner': 'program accommodation callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'hotelId',
    'label',
    'roomType',
    'totalRooms',
    'assignedCount',
    'heldForGroupIds',
    'startsAt',
    'endsAt',
    'createdAt',
    'updatedAt',
    'revision',
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
    'hotelId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'programHotels doc this block reserves rooms at; must belong to the same program.',
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
      'description': 'Organizer-facing block name, e.g. \'Bride family — Deluxe\'.',
    },
    'roomType': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 140,
      'description': 'Optional hotel room class (Deluxe, Suite). Null when the block is type-agnostic.',
    },
    'totalRooms': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 500,
      'description': 'Rooms held under this block.',
    },
    'assignedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'description': 'Peak simultaneous occupied rooms across local contract nights; recomputed from explicit occupancy identities, not guest rows.',
    },
    'heldForGroupIds': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'description': 'programGuestGroups this block is earmarked for; allocation prefers matching groups before general inventory.',
    },
    'startsAt': <String, Object?>{
      'type': 'object',
      'description': 'First night of the stay window this block covers.',
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
    'endsAt': <String, Object?>{
      'type': 'object',
      'description': 'Checkout day of the stay window this block covers.',
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
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'description': 'Operational notes visible to organizer and hotel desk (rate contact, holding conditions).',
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'anonymizedAt': <String, Object?>{
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
      'description': 'Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.',
    },
    'maxOccupantsPerRoom': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 20,
      'description': 'Coordinator-verified occupant limit for each contracted room. Defaults to one when unknown; does not establish bed type or accessibility.',
    },
  },
};
