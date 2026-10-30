// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/public_event_payments.schema.json.

const schemaPublicEventPaymentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/public_event_payments.schema.json',
  'title': 'PublicEventPaymentDocument',
  'description': 'Server-owned public OTP checkout. Holds and financial recovery share the event payment engine; no application approval or form-offer identity is implied.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'recipientUid',
    'requestId',
    'canonicalSeatKey',
    'identityRevision',
    'migrationRevision',
    'routing',
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
    'registrationRevision',
    'attendeeId',
    'phoneE164',
    'displayName',
    'eventName',
    'requestHash',
    'inviteLinkId',
    'cancellationPolicy',
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
    'recipientUid': <String, Object?>{
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
      'pattern': '^pp_[a-f0-9]{32}\$',
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
    'registrationRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'phoneE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'eventName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'inviteLinkId': <String, Object?>{
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
  },
  'x-firestore-collection': 'publicEventPayments',
  'x-firestore-path': 'publicEventPayments/{paymentId}',
  'x-document-id-field': 'paymentId',
  'x-owner': 'public event checkout service',
};
