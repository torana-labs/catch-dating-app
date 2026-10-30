// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/commercial_terms_override.schema.json.

const schemaCommercialTermsOverrideSchema = <String, Object?>{
  'description': 'Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'commission': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'rateBasisPoints': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 10000,
        },
        'capMinor': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'cycleDays': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 366,
        },
        'cycleAnchor': <String, Object?>{
          'enum': <Object?>[
            'trialEnd',
          ],
        },
        'base': <String, Object?>{
          'enum': <Object?>[
            'netOfRefunds',
            'gross',
          ],
        },
        'taxTreatment': <String, Object?>{
          'enum': <Object?>[
            'exclusive',
            'inclusive',
          ],
        },
      },
    },
    'trial': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'days': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 366,
        },
        'anchor': <String, Object?>{
          'enum': <Object?>[
            'firstEvent',
          ],
        },
      },
    },
    'toolsOnly': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'feeMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000000,
        },
      },
    },
    'gatewayFeeBearer': <String, Object?>{
      'enum': <Object?>[
        'host',
        'platform',
      ],
    },
    'purposes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'eventAdmission': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
            },
          },
        },
        'formFee': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
            },
          },
        },
        'hostMembership': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
            },
          },
        },
      },
    },
  },
  'title': 'CommercialTermsOverride',
};
