// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_commercial_terms_response.schema.json.

const schemaManageCommercialTermsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_commercial_terms_response.schema.json',
  'title': 'ManageCommercialTermsCallableResponse',
  'description': 'The stored record for the requested scope plus, for an organizer, the merged effective terms (null while platform defaults are unconfigured).',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'termsId',
    'organizerId',
    'revision',
    'terms',
    'reason',
    'updatedAtMillis',
    'effectiveTerms',
    'platformRevision',
  ],
  'properties': <String, Object?>{
    'termsId': <String, Object?>{
      'type': 'string',
      'pattern': '^(platform|org_[a-f0-9]{64})\$',
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'terms': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        },
        <String, Object?>{
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
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'updatedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'effectiveTerms': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'platformRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
