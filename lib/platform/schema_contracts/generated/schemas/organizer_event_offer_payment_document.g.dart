// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_event_offer_payments.schema.json.

const schemaOrganizerEventOfferPaymentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_event_offer_payments.schema.json',
  'title': 'OrganizerEventOfferPaymentDocument',
  'description': 'Server-owned payment attempt created atomically with its 15-minute canonical-seat hold. Routing and issued terms remain frozen through capture, admission, expiry and refund recovery.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'offerId',
    'responseId',
    'contactId',
    'originId',
    'recipientUid',
    'grantId',
    'requestId',
    'canonicalSeatKey',
    'offerGeneration',
    'offerRevision',
    'identityRevision',
    'migrationRevision',
    'routing',
    'paymentSnapshot',
    'amountPaise',
    'currency',
    'receipt',
    'status',
    'providerOrderId',
    'providerPaymentId',
    'providerRefundId',
    'refundedAmountPaise',
    'admissionReceiptId',
    'reservationReleased',
    'leaseUntil',
    'createdAt',
    'updatedAt',
    'checkoutExpiresAt',
    'capturedAt',
    'admittedAt',
    'lastErrorCode',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'offerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'originId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'recipientUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'grantId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'canonicalSeatKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'offerGeneration': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'offerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'identityRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'migrationRevision': <String, Object?>{
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
    'amountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 100,
      'maximum': 100000000,
    },
    'currency': <String, Object?>{
      'const': 'INR',
    },
    'receipt': <String, Object?>{
      'type': 'string',
      'pattern': '^ep_[a-f0-9]{32}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'creatingOrder',
        'orderUnknown',
        'checkoutReady',
        'verifying',
        'captured',
        'admitted',
        'expired',
        'refundPending',
        'refunded',
        'reviewRequired',
        'failed',
        'cancelled',
      ],
    },
    'providerOrderId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^order_[A-Za-z0-9]+\$',
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'providerPaymentId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^pay_[A-Za-z0-9]+\$',
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'providerRefundId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^rfnd_[A-Za-z0-9]+\$',
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'refundedAmountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
    },
    'admissionReceiptId': <String, Object?>{
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
    'reservationReleased': <String, Object?>{
      'type': 'boolean',
    },
    'leaseUntil': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'checkoutExpiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'capturedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'admittedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'lastErrorCode': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'maxLength': 80,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'settlement': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Durable Route hold-release intent and provider observation. Release is separate from settled funds. Optional only for pre-admission and older attempts.',
      'required': <Object?>[
        'state',
        'transferId',
        'nextAttemptAtMillis',
        'leaseUntilMillis',
        'leaseId',
        'authorizedAtMillis',
        'completedAtMillis',
        'releasedAtMillis',
        'settledAtMillis',
      ],
      'properties': <String, Object?>{
        'state': <String, Object?>{
          'enum': <Object?>[
            'waiting',
            'releasePending',
            'released',
            'settled',
            'blocked',
            'reviewRequired',
            'reversed',
          ],
        },
        'transferId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^trf_[A-Za-z0-9]+\$',
              'maxLength': 128,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'nextAttemptAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'leaseUntilMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'leaseId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{32}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'authorizedAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'completedAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'releasedAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'settledAtMillis': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'cancellation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'reason',
        'requestedAtMillis',
        'attendeeId',
        'refundAmountPaise',
        'seatRetained',
      ],
      'properties': <String, Object?>{
        'reason': <String, Object?>{
          'enum': <Object?>[
            'eventCancelled',
            'guestCancelled',
          ],
        },
        'requestedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'refundAmountPaise': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 100000000,
        },
        'seatRetained': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'cancellationPolicy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'refundDeadlineMillis',
        'eventStartsAtMillis',
      ],
      'properties': <String, Object?>{
        'refundDeadlineMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'eventStartsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
