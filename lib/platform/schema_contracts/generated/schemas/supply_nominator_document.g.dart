// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/supply_nominators.schema.json.

const schemaSupplyNominatorDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/supply_nominators.schema.json',
  'title': 'SupplyNominatorDocument',
  'description': 'A person staff have allowed to nominate organizers by messaging Catch. A WhatsApp nominator is keyed by the hash of their number, which is the same endpoint hash the WhatsApp receipts use, so the number itself is never stored; only its last four digits are kept so staff can tell entries apart. Each message from an active nominator becomes Supply Intake nominations credited to their Catch account. Their authority (a sales role, or a current partner membership) is checked again on every message.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'supplyNominators',
  'x-firestore-path': 'supplyNominators/{nominatorId}',
  'x-document-id-field': 'nominatorId',
  'x-owner': 'Admin nominator registry callables',
  'required': <Object?>[
    'schemaVersion',
    'nominatorId',
    'channel',
    'endpointHash',
    'phoneLast4',
    'role',
    'uid',
    'displayName',
    'defaultMarket',
    'active',
    'createdAt',
    'updatedAt',
    'updatedByUid',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'nominatorId': <String, Object?>{
      'type': 'string',
      'pattern': '^whatsapp-[a-f0-9]{64}\$',
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'whatsapp',
      ],
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'phoneLast4': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}\$',
    },
    'role': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'associate',
        'partner',
      ],
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'defaultMarket': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-z][a-z0-9-]{1,49}\$',
    },
    'active': <String, Object?>{
      'type': 'boolean',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
  },
};
