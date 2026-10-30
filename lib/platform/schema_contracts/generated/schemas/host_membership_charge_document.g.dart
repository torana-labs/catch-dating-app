// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_charges.schema.json.

const schemaHostMembershipChargeDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_charges.schema.json',
  'title': 'HostMembershipChargeDocument',
  'description': 'Server-only ledger of every captured membership charge, keyed by the provider payment id, and the commission statement\'s membership source. hostCollected charges were paid to the organizer\'s own account: no fee is deducted and no transfer is made (transfer.state notRequired). platformSplit charges are split to the organizer\'s Route account minus the at-source fee. Each new charge freezes the effective commercial terms.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipCharges',
  'x-firestore-path': 'hostMembershipCharges/{chargeId}',
  'x-document-id-field': 'chargeId',
  'x-owner': 'membership webhook and reconcileHostMembershipCharges schedule',
  'required': <Object?>[
    'schemaVersion',
    'membershipId',
    'organizerId',
    'uid',
    'provider',
    'providerSubscriptionId',
    'amountPaise',
    'feePaise',
    'transferAmountPaise',
    'periodStartMillis',
    'periodEndMillis',
    'providerAccountId',
    'mode',
    'transfer',
    'createdAtMillis',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^hm_[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'provider': <String, Object?>{
      'enum': <Object?>[
        'razorpay',
      ],
      'x-catch-ownership': 'server-only',
    },
    'providerSubscriptionId': <String, Object?>{
      'type': 'string',
      'pattern': '^sub_[A-Za-z0-9]{6,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'amountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 100,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'feePaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'transferAmountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1500000,
      'x-catch-ownership': 'server-only',
    },
    'periodStartMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'periodEndMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'mode': <String, Object?>{
      'enum': <Object?>[
        'test',
        'live',
      ],
      'x-catch-ownership': 'server-only',
    },
    'moneyFlow': <String, Object?>{
      'description': 'Absent on charges recorded under the original platform-account model, which is platformSplit.',
      'enum': <Object?>[
        'hostCollected',
        'platformSplit',
      ],
      'x-catch-ownership': 'server-only',
    },
    'commercialTerms': <String, Object?>{
      'description': 'Effective terms frozen when the charge was recorded. Absent on charges recorded before commercial terms existed.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'purpose',
        'organizerId',
        'platformRevision',
        'organizerRevision',
        'moneyFlow',
        'merchantOfRecord',
        'currency',
        'commission',
        'trial',
        'toolsOnly',
        'gatewayFeeBearer',
        'purposeTerms',
        'resolvedAtMillis',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'const': 1,
        },
        'purpose': <String, Object?>{
          'enum': <Object?>[
            'eventAdmission',
            'formFee',
            'hostMembership',
          ],
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'platformRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'organizerRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'moneyFlow': <String, Object?>{
          'description': 'hostCollected: the guest pays the organizer\'s own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch\'s platform account collects and transfers the organizer\'s share (Razorpay Route), deducting any at-source fee.',
          'enum': <Object?>[
            'hostCollected',
            'platformSplit',
          ],
        },
        'merchantOfRecord': <String, Object?>{
          'enum': <Object?>[
            'host',
            'platform',
          ],
        },
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
        'purposeTerms': <String, Object?>{
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
        'resolvedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'transfer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'state',
        'transferId',
        'attempts',
        'lastError',
      ],
      'properties': <String, Object?>{
        'state': <String, Object?>{
          'enum': <Object?>[
            'pending',
            'requesting',
            'created',
            'failed',
            'notRequired',
          ],
        },
        'transferId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^trf_[A-Za-z0-9]{6,40}\$',
        },
        'attempts': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100,
        },
        'lastError': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 200,
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
