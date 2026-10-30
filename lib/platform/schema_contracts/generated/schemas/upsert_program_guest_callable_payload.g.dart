// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_guest_payload.schema.json.

const schemaUpsertProgramGuestCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_guest_payload.schema.json',
  'title': 'UpsertProgramGuestCallablePayload',
  'description': 'Create or update one program guest. guestId absent creates; expectedRevision fences updates. A shared phone never merges guests.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'displayName',
  ],
  'properties': <String, Object?>{
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
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'householdId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
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
      'description': 'When present, replaces the guest\'s programGuestGroups membership. Every id must belong to the same program and organizer. Omitted preserves existing membership.',
    },
    'phoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 20,
    },
    'email': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 320,
    },
    'externalReference': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
    'rsvpStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'attending',
        'declined',
        'maybe',
      ],
    },
    'fieldChoices': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'phoneE164': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'email': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
      },
      'description': 'Review an existing same-program, same-guest field assertion. expectedRevision fences the selection; endpoints cannot simultaneously provide a scalar and a choice.',
    },
  },
};
