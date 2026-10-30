// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/external_event_blocker_resolution.schema.json.

const schemaExternalEventBlockerResolutionSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/external_event_blocker_resolution.schema.json',
  'title': 'ExternalEventBlockerResolution',
  'description': 'One explicit, event-scoped resolution or policy-backed waiver for a governed external-event import blocker.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'blockerCode',
    'outcome',
    'policyGapDecisionId',
    'note',
  ],
  'properties': <String, Object?>{
    'blockerCode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'missing_exact_coordinates',
        'missing_end_time',
        'missing_location_detail',
        'requires_event_defaults_policy',
        'requires_owner_safe_copy_review',
        'duplicate_normalized_event_key',
      ],
    },
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'resolved',
        'waived',
      ],
    },
    'policyGapDecisionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'outcome': <String, Object?>{
            'const': 'waived',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'policyGapDecisionId': <String, Object?>{
            'type': 'string',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'outcome': <String, Object?>{
            'const': 'resolved',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'policyGapDecisionId': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
  ],
};
