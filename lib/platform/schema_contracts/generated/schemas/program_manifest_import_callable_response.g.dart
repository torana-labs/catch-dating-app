// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_manifest_import_response.schema.json.

const schemaProgramManifestImportCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_manifest_import_response.schema.json',
  'title': 'ProgramManifestImportCallableResponse',
  'description': 'Manifest import plan or commit summary. Row errors never silently drop data: every rejected row reports its index and reason.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'importProgramManifest',
    'importWeddingPhoneContacts',
  ],
  'required': <Object?>[
    'mode',
    'totalRows',
    'guestsCreated',
    'guestsUpdated',
    'legsCreated',
    'legsUpdated',
    'householdsCreated',
    'partiesCreated',
    'groupsCreated',
    'rowErrors',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'preview',
        'commit',
      ],
    },
    'totalRows': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'guestsCreated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'guestsUpdated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'legsCreated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'legsUpdated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'householdsCreated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'partiesCreated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'groupsCreated': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'description': 'programGuestGroups documents created by label resolution during this import.',
    },
    'rowErrors': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'index',
          'message',
        ],
        'properties': <String, Object?>{
          'index': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'message': <String, Object?>{
            'type': 'string',
            'maxLength': 280,
          },
        },
      },
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
    },
  },
};
