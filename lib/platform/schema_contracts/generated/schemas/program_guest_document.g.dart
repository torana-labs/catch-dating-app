// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_guests.schema.json.

const schemaProgramGuestDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_guests.schema.json',
  'title': 'ProgramGuestDocument',
  'description': 'Server-owned person-level wedding/corporate guest record. One document per invited person; household membership and optional CRM contact links are explicit. A shared phone number never merges two guests.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programGuests',
  'x-firestore-path': 'programGuests/{guestId}',
  'x-document-id-field': 'guestId',
  'x-owner': 'program guest management and reviewed conversion callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'displayName',
    'householdId',
    'contactId',
    'phoneE164',
    'email',
    'externalReference',
    'groupIds',
    'invitationStatus',
    'rsvpStatus',
    'source',
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
    'contactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Optional link to organizerContacts. Absence never blocks guest operations.',
    },
    'phoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 20,
      'description': 'Optional reachable phone for this person. Shared family phones do not merge identities.',
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
      'description': 'Planner-side reference such as a spreadsheet id or invitation code.',
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
      'description': 'Current canonical social membership truth. Host selections update it through upsertProgramGuest; imported group labels append source-labelled suggestions without changing this projection.',
    },
    'invitationStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notInvited',
        'invited',
        'delivered',
        'responded',
      ],
    },
    'rsvpStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'attending',
        'declined',
        'maybe',
      ],
      'description': 'Derived program-wide rollup maintained by the server from programFunctionGuests rows (any attending -> attending, else strongest other response). Per-function truth lives only on programFunctionGuests; writers never set this directly.',
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'manual',
        'import',
        'formResponse',
      ],
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
    'fieldSelections': <String, Object?>{
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
      'description': 'Current values are a projection of these exact immutable same-program assertions. Absent fields have unknown acquisition provenance.',
    },
    'fieldConflicts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
        'phoneE164': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
        'email': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
      },
      'description': 'Imported conflicting assertions awaiting explicit host field choice. All historical assertions remain in their scoped ledger.',
    },
    'membershipSelections': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'groupId',
          'assertionId',
        ],
        'properties': <String, Object?>{
          'groupId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'assertionId': <String, Object?>{
            'type': 'string',
            'pattern': '^wma_[a-f0-9]{64}\$',
          },
        },
      },
      'description': 'Exact immutable host membership choices; includes and excludes survive every import.',
    },
    'membershipSuggestions': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'groupId',
          'assertionId',
        ],
        'properties': <String, Object?>{
          'groupId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'assertionId': <String, Object?>{
            'type': 'string',
            'pattern': '^wma_[a-f0-9]{64}\$',
          },
        },
      },
      'description': 'Source-labelled unapproved membership assertions. Never add canonical groupIds without a host choice.',
    },
  },
};
