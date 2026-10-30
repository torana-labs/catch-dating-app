// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_domains.schema.json.

const schemaOrganizerFormDomainDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_domains.schema.json',
  'title': 'OrganizerFormDomainDocument',
  'description': 'Server-owned exact hostname lease and verified form binding. Client reads and writes are forbidden.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerFormDomains',
  'x-firestore-path': 'organizerFormDomains/{hostname}',
  'x-document-id-field': 'hostname',
  'x-owner': 'organizer form domain registry',
  'required': <Object?>[
    'hostname',
    'organizerId',
    'formId',
    'publicFormId',
    'ownershipChallenge',
    'expectedCname',
    'status',
    'certificateStatus',
    'verifiedAtMillis',
    'generation',
    'reservedAtMillis',
    'pendingExpiresAtMillis',
  ],
  'properties': <String, Object?>{
    'hostname': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 253,
      'pattern': '^[a-z0-9.-]+\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'ownershipChallenge': <String, Object?>{
      'type': 'string',
      'pattern': '^catch-verification=[A-Za-z0-9_-]{32}\$',
    },
    'expectedCname': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 253,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'verified',
        'active',
        'revoked',
      ],
    },
    'certificateStatus': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'ready',
        'failed',
      ],
    },
    'verifiedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'generation': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reservedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'pendingExpiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
  },
};
