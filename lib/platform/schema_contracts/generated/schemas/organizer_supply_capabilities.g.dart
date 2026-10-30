// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/organizer_supply_capabilities.schema.json.

const schemaOrganizerSupplyCapabilitiesSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/organizer_supply_capabilities.schema.json',
  'title': 'OrganizerSupplyCapabilities',
  'description': 'Canonical organizer-level ceiling for member affordances. Event policy may narrow these capabilities but may never widen them.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'mode',
    'bookable',
    'paymentsEnabled',
    'waitlistEnabled',
    'hostContactEnabled',
    'claimable',
    'reviewPolicy',
  ],
  'properties': <String, Object?>{
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unclaimed_read_only',
        'claimed_managed',
      ],
    },
    'bookable': <String, Object?>{
      'type': 'boolean',
    },
    'paymentsEnabled': <String, Object?>{
      'type': 'boolean',
    },
    'waitlistEnabled': <String, Object?>{
      'type': 'boolean',
    },
    'hostContactEnabled': <String, Object?>{
      'type': 'boolean',
    },
    'claimable': <String, Object?>{
      'type': 'boolean',
    },
    'reviewPolicy': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'after_event_end',
        'attended_event_only',
      ],
    },
  },
  'oneOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'const': 'unclaimed_read_only',
        },
        'bookable': <String, Object?>{
          'const': false,
        },
        'paymentsEnabled': <String, Object?>{
          'const': false,
        },
        'waitlistEnabled': <String, Object?>{
          'const': false,
        },
        'hostContactEnabled': <String, Object?>{
          'const': false,
        },
        'reviewPolicy': <String, Object?>{
          'const': 'after_event_end',
        },
      },
      'required': <Object?>[
        'mode',
        'bookable',
        'paymentsEnabled',
        'waitlistEnabled',
        'hostContactEnabled',
        'reviewPolicy',
      ],
    },
    <String, Object?>{
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'const': 'claimed_managed',
        },
        'bookable': <String, Object?>{
          'const': true,
        },
        'paymentsEnabled': <String, Object?>{
          'const': true,
        },
        'waitlistEnabled': <String, Object?>{
          'const': true,
        },
        'hostContactEnabled': <String, Object?>{
          'const': true,
        },
        'claimable': <String, Object?>{
          'const': false,
        },
        'reviewPolicy': <String, Object?>{
          'const': 'attended_event_only',
        },
      },
      'required': <Object?>[
        'mode',
        'bookable',
        'paymentsEnabled',
        'waitlistEnabled',
        'hostContactEnabled',
        'claimable',
        'reviewPolicy',
      ],
    },
  ],
};
