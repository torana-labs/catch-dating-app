// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_admission_receipts.schema.json.

const schemaOrganizerFormAdmissionReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_admission_receipts.schema.json',
  'title': 'OrganizerFormAdmissionReceiptDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'responseId',
    'contactId',
    'offerId',
    'expectedOfferRevision',
    'expectedOfferGeneration',
    'expectedLedgerRevision',
    'requestId',
    'receiptId',
    'attendeeId',
    'canonicalSeatKey',
    'requestHash',
    'resultingLedgerRevision',
    'admittedAtMillis',
    'seatAlreadyOccupied',
    'actorUid',
    'paymentSnapshot',
    'manualPayment',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'offerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'expectedOfferRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedOfferGeneration': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedLedgerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'canonicalSeatKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'resultingLedgerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'admittedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'seatAlreadyOccupied': <String, Object?>{
      'type': 'boolean',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'paymentSnapshot': <String, Object?>{
      'title': 'EventOfferPaymentSnapshot',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventPaymentRevision',
        'eventPaymentHash',
        'expectedAmountMinor',
        'currency',
        'reusablePaymentPageUrl',
        'paymentInstructions',
        'messageTemplate',
        'expiresAtMillis',
        'collectionMode',
        'personalPaymentLink',
      ],
      'properties': <String, Object?>{
        'eventPaymentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000000,
        },
        'eventPaymentHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'expectedAmountMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        'currency': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Z]{3}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reusablePaymentPageUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2048,
              'format': 'uri',
              'pattern': '^https://',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'paymentInstructions': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'messageTemplate': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'collectionMode': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'manualInstructions',
                'reusablePage',
                'personalRequest',
                'catchCheckout',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'personalPaymentLink': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2048,
              'format': 'uri',
              'pattern': '^https://',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'manualPayment': <String, Object?>{
      'title': 'EventOfferManualPayment',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'evidenceReference',
        'evidenceRecordedAtMillis',
        'reviewedByUid',
        'reviewedAtMillis',
        'reviewNote',
        'bankReceiptChecked',
        'attestedAmountMinor',
        'attestedCurrency',
        'attestedEventPaymentRevision',
        'attestedEventPaymentHash',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
            'evidenceSubmitted',
            'hostAttestedReceived',
            'rejected',
          ],
        },
        'evidenceReference': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 3,
              'maxLength': 240,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'evidenceRecordedAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reviewedByUid': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9_-]{1,180}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reviewedAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'reviewNote': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 3,
              'maxLength': 240,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'bankReceiptChecked': <String, Object?>{
          'type': 'boolean',
        },
        'attestedAmountMinor': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'attestedCurrency': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Z]{3}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'attestedEventPaymentRevision': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000000000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'attestedEventPaymentHash': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'applicationApproval': <String, Object?>{
      'description': 'Current native form application approval checked atomically at admission. Absent on legacy receipts.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'applicationId',
            'revision',
            'contactId',
            'reviewedAtMillis',
          ],
          'properties': <String, Object?>{
            'applicationId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'contactId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'reviewedAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
          },
        },
      ],
    },
    'providerPayment': <String, Object?>{
      'description': 'Frozen server-verified payment authority for automatic admission; absent on manual/free admissions.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'paymentId',
        'providerOrderId',
        'providerPaymentId',
        'recipientUid',
        'grantId',
        'capturedAtMillis',
        'routing',
      ],
      'properties': <String, Object?>{
        'paymentId': <String, Object?>{
          'type': 'string',
          'pattern': '^ep_[a-f0-9]{32}\$',
        },
        'providerOrderId': <String, Object?>{
          'type': 'string',
          'pattern': '^order_[A-Za-z0-9]+\$',
          'maxLength': 128,
        },
        'providerPaymentId': <String, Object?>{
          'type': 'string',
          'pattern': '^pay_[A-Za-z0-9]+\$',
          'maxLength': 128,
        },
        'recipientUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'grantId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'capturedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'routing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'version',
            'purpose',
            'organizerId',
            'selection',
            'policySource',
            'appRevision',
            'organizerRevision',
            'bindingId',
            'merchantAccountId',
            'destinationAccountId',
            'configurationVersion',
            'checkoutKey',
            'amountMinor',
            'transferAmountMinor',
            'settlementHold',
          ],
          'properties': <String, Object?>{
            'version': <String, Object?>{
              'const': 1,
            },
            'amountMinor': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'transferAmountMinor': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'settlementHold': <String, Object?>{
              'type': <Object?>[
                'boolean',
                'null',
              ],
            },
            'purpose': <String, Object?>{
              'enum': <Object?>[
                'formFee',
                'eventAdmission',
              ],
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'selection': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'route',
                'mode',
                'currency',
                'merchantCountry',
              ],
              'properties': <String, Object?>{
                'route': <String, Object?>{
                  'enum': <Object?>[
                    'razorpayRoute',
                    'razorpayOAuth',
                    'stripeConnectDirect',
                    'stripeConnectDestination',
                  ],
                },
                'mode': <String, Object?>{
                  'enum': <Object?>[
                    'test',
                    'live',
                  ],
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'merchantCountry': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{2}\$',
                },
              },
            },
            'policySource': <String, Object?>{
              'enum': <Object?>[
                'app',
                'organizer',
                'legacy',
              ],
            },
            'appRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'organizerRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'bindingId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'merchantAccountId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'destinationAccountId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 160,
            },
            'configurationVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
            },
            'checkoutKey': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 256,
            },
            'commercialTerms': <String, Object?>{
              'description': 'Effective commercial terms frozen when the attempt was prepared. Absent on payments prepared before commercial terms existed, or while platform defaults were unconfigured for a hostCollected route; a commission statement reviews those explicitly.',
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
            },
          },
        },
      },
    },
  },
};
