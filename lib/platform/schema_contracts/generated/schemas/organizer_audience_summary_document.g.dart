// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_audience_summaries.schema.json.

const schemaOrganizerAudienceSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_audience_summaries.schema.json',
  'title': 'OrganizerAudienceSummaryDocument',
  'description': 'Server-maintained scalable organizer audience summary projected from contact traits.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerAudienceSummaries',
  'x-firestore-path': 'organizerAudienceSummaries/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'organizer audience projection and getOrganizerCrmSummary',
  'required': <Object?>[
    'organizerId',
    'contactCount',
    'pastAttendeeCount',
    'repeatAttendeeCount',
    'linkedAccountCount',
    'importedContactCount',
    'advocateCount',
    'highImpactAdvocateCount',
    'whatsappOptInCount',
    'smsOptInCount',
    'sourceCoverage',
    'projectionVersion',
    'computedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'pastAttendeeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'repeatAttendeeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'linkedAccountCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'importedContactCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'advocateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'highImpactAdvocateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'whatsappOptInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'smsOptInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'sourceCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'partial',
      ],
    },
    'projectionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
    },
    'computedAt': <String, Object?>{
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
  },
  'definitions': <String, Object?>{
    'count': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
  },
};
