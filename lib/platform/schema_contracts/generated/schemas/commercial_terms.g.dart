// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/commercial_terms.schema.json.

const schemaCommercialTermsSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'currency',
    'commission',
    'trial',
    'toolsOnly',
    'gatewayFeeBearer',
    'purposes',
  ],
  'properties': <String, Object?>{
    'currency': <String, Object?>{
      'const': 'INR',
    },
    'commission': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'rateBasisPoints',
        'capMinor',
        'cycleDays',
        'cycleAnchor',
        'base',
        'taxTreatment',
      ],
      'properties': <String, Object?>{
        'rateBasisPoints': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 10000,
        },
        'capMinor': <String, Object?>{
          'description': 'Cap per cycle in minor units; null means uncapped.',
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
          'description': 'exclusive: amounts are before GST, which is added on top.',
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
      'required': <Object?>[
        'days',
        'anchor',
      ],
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
      'required': <Object?>[
        'feeMinor',
      ],
      'properties': <String, Object?>{
        'feeMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000000,
          'description': 'Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission.',
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
      'required': <Object?>[
        'eventAdmission',
        'formFee',
        'hostMembership',
      ],
      'properties': <String, Object?>{
        'eventAdmission': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'countsTowardCommission',
            'atSourceFeeBasisPoints',
          ],
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
              'description': 'Fee deducted from each payment before the organizer\'s transfer. Applies only when the purpose\'s money flow is platformSplit.',
            },
          },
        },
        'formFee': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'countsTowardCommission',
            'atSourceFeeBasisPoints',
          ],
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
              'description': 'Fee deducted from each payment before the organizer\'s transfer. Applies only when the purpose\'s money flow is platformSplit.',
            },
          },
        },
        'hostMembership': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'countsTowardCommission',
            'atSourceFeeBasisPoints',
          ],
          'properties': <String, Object?>{
            'countsTowardCommission': <String, Object?>{
              'type': 'boolean',
            },
            'atSourceFeeBasisPoints': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9999,
              'description': 'Fee deducted from each payment before the organizer\'s transfer. Applies only when the purpose\'s money flow is platformSplit.',
            },
          },
        },
      },
    },
  },
  'title': 'CommercialTerms',
};
