// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_link_organizer_intake_to_sales_payload.schema.json.

const schemaAdminLinkOrganizerIntakeToSalesPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_link_organizer_intake_to_sales_payload.schema.json',
  'title': 'AdminLinkOrganizerIntakeToSalesPayload',
  'description': 'Links an employee-reviewed Supply Intake canonical organizer decision to its private Sales account; no organizer, publication or ownership mutation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'workItemId',
    'candidateId',
    'expectedWorkItemRevision',
    'expectedCandidateHash',
    'organizerId',
    'curationPath',
    'requestId',
  ],
  'properties': <String, Object?>{
    'workItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'candidateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'expectedWorkItemRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'expectedCandidateHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'curationPath': <String, Object?>{
      'type': 'string',
      'minLength': 34,
      'maxLength': 270,
      'pattern': '^organizerIntakeCurationDecisions/[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
