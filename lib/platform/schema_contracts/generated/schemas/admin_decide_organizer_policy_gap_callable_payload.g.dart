// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_decide_organizer_policy_gap_payload.schema.json.

const schemaAdminDecideOrganizerPolicyGapCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_decide_organizer_policy_gap_payload.schema.json',
  'title': 'AdminDecideOrganizerPolicyGapCallablePayload',
  'description': 'Callable payload accepted by adminDecideOrganizerPolicyGap. This records a manual product/admin review decision for an organizer intake policy gap without enabling crawls, provider lookups, imports, defaults, or naming migrations.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'gapId',
    'decision',
    'requiredInputsReviewed',
    'checklist',
    'note',
  ],
  'properties': <String, Object?>{
    'gapId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accept',
        'hold',
        'reject',
      ],
    },
    'requiredInputsReviewed': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
      'uniqueItems': true,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requiredInputsReviewed',
        'costAndSafetyReviewed',
        'implementationOwnerReviewed',
        'behaviorStillDisabledAcknowledged',
      ],
      'properties': <String, Object?>{
        'requiredInputsReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'costAndSafetyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'implementationOwnerReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'behaviorStillDisabledAcknowledged': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
