// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_create_organizer_draft_from_candidate_payload.schema.json.

const schemaAdminCreateOrganizerDraftFromCandidateCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_create_organizer_draft_from_candidate_payload.schema.json',
  'title': 'AdminCreateOrganizerDraftFromCandidateCallablePayload',
  'description': 'Creates one unclaimed, source-backed organizer draft from an exact reviewed Supply Intake work item. The callable cannot publish, index, expose in the app, enable crawling, or assign ownership.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'workItemId',
    'candidateId',
    'publicSlug',
    'name',
    'organizerType',
    'reviewNote',
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
    'publicSlug': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 64,
      'pattern': '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])\$',
      'description': 'Human-readable public route slug. The callable allocates a separate opaque Firestore organizer document id.',
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'organizerType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'club',
        'community',
        'individual',
        'eventProducer',
        'venue',
        'brand',
      ],
      'description': 'Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.',
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 10,
      'maxLength': 500,
    },
  },
};
