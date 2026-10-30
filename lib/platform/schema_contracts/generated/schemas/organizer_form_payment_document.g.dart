// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_payments.schema.json.

const schemaOrganizerFormPaymentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_payments.schema.json',
  'title': 'OrganizerFormPaymentDocument',
  'description': 'Durable form fee ledger. Frozen answers remain in the revision-bound response draft; payment is separate from application review and event admission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'draftId',
    'respondentUid',
    'connectionId',
    'accountId',
    'mode',
    'draftRevision',
    'answersHash',
    'identity',
    'amountPaise',
    'currency',
    'description',
    'refundPolicy',
    'receipt',
    'status',
    'providerOrderId',
    'providerPaymentId',
    'providerRefundId',
    'refundedAmountPaise',
    'responseId',
    'reservationReleased',
    'leaseUntil',
    'createdAt',
    'updatedAt',
    'checkoutExpiresAt',
    'capturedAt',
    'submittedAt',
    'lastErrorCode',
  ],
  'properties': <String, Object?>{
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
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'versionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'respondentUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
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
    'accountId': <String, Object?>{
      'type': 'string',
      'pattern': '^acc_[A-Za-z0-9]+\$',
    },
    'mode': <String, Object?>{
      'enum': <Object?>[
        'test',
        'live',
      ],
      'type': 'string',
    },
    'draftRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'answersHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'identity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayName',
        'email',
        'phoneE164',
        'searchName',
        'origin',
      ],
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'searchName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'origin': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'anonymous',
            'respondentGranted',
            'organizerAcquired',
          ],
        },
      },
    },
    'amountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 100,
      'maximum': 10000000,
    },
    'currency': <String, Object?>{
      'const': 'INR',
    },
    'description': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'refundPolicy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'receipt': <String, Object?>{
      'type': 'string',
      'pattern': '^cfp_[a-f0-9]{32}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'creatingOrder',
        'orderUnknown',
        'checkoutReady',
        'verifying',
        'captured',
        'submitted',
        'failed',
        'expired',
        'refundPending',
        'refunded',
        'reviewRequired',
      ],
      'type': 'string',
    },
    'providerOrderId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^order_[A-Za-z0-9]+\$',
    },
    'providerPaymentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^pay_[A-Za-z0-9]+\$',
    },
    'providerRefundId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^rfnd_[A-Za-z0-9]+\$',
    },
    'refundedAmountPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10000000,
    },
    'responseId': <String, Object?>{
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
    'submittedAt': <String, Object?>{
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
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
  },
  'x-firestore-collection': 'organizerFormPayments',
  'x-firestore-path': 'organizerFormPayments/{paymentId}',
  'x-document-id-field': 'paymentId',
  'x-owner': 'organizer form payment server operations',
};
