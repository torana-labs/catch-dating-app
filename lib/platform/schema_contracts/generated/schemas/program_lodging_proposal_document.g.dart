// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_lodging_proposals.schema.json.

const schemaProgramLodgingProposalDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_lodging_proposals.schema.json',
  'title': 'ProgramLodgingProposalDocument',
  'description': 'Private immutable placement proposal tied to source, inventory, layout and published revisions. Server validates content identity and current canonical Programs scope; no hotel affinity or medical projection is public.',
  'x-firestore-collection': 'programLodgingProposals',
  'x-firestore-path': 'programLodgingProposals/{proposalId}',
  'x-document-id-field': 'proposalId',
  'x-owner': 'private program lodging server operations',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'organizerId',
    'proposal',
    'createdByUid',
    'createdAtMillis',
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
    'createdByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
