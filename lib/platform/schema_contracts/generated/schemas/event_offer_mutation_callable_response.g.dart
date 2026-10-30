// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_offer_mutation_response.schema.json.

const schemaEventOfferMutationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_offer_mutation_response.schema.json',
  'title': 'EventOfferMutationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'offer',
    'receipt',
    'replayed',
  ],
  'properties': <String, Object?>{
    'offer': <String, Object?>{
      'title': 'OrganizerEventOfferDocument',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'eventId',
        'contactId',
        'applicationId',
        'sourceKind',
        'offerId',
        'status',
        'generation',
        'revision',
        'expiresAtMillis',
        'organizerPaymentLink',
        'paymentSnapshot',
        'offeredAtMillis',
        'manualPayment',
        'createdAtMillis',
        'updatedAtMillis',
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
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        'applicationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        'sourceKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'application',
            'formResponse',
          ],
        },
        'offerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'draft',
            'offered',
            'withdrawn',
            'expired',
          ],
        },
        'generation': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'expiresAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'organizerPaymentLink': <String, Object?>{
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
        'offeredAtMillis': <String, Object?>{
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
        'createdAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'updatedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'receipt': <String, Object?>{
      'title': 'OrganizerEventOfferActionReceiptDocument',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'offerId',
        'requestId',
        'requestHash',
        'resultingGeneration',
        'resultingRevision',
      ],
      'properties': <String, Object?>{
        'offerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 120,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'resultingGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'resultingRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
