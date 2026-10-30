// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_lodging_workflows.schema.json.

const schemaProgramLodgingWorkflowDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_lodging_workflows.schema.json',
  'title': 'ProgramLodgingWorkflowDocument',
  'description': 'Private program workflow. Host approval, individual hotel confirmation and guest publication are distinct states. Publication changes canonical stays and this workflow atomically.',
  'x-firestore-collection': 'programLodgingWorkflows',
  'x-firestore-path': 'programLodgingWorkflows/{programId}',
  'x-document-id-field': 'programId',
  'x-owner': 'private program lodging server operations',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'organizerId',
    'workflow',
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
    'workflow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'approvedProposalId',
        'confirmedHotelIds',
        'guestPublishedProposalId',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'approvedProposalId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^[a-f0-9]{64}\$',
        },
        'confirmedHotelIds': <String, Object?>{
          'type': 'array',
          'maxItems': 500,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'x-catch-ownership': 'server-only',
          },
          'uniqueItems': true,
        },
        'guestPublishedProposalId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
      'x-catch-ownership': 'server-only',
    },
  },
};
