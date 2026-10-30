// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_viewer_state_response.schema.json.

const schemaGetEventViewerStateCallableResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'viewer',
  ],
  'properties': <String, Object?>{
    'viewer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'organizerId',
        'observedAtMillis',
        'membership',
        'review',
        'admission',
        'attendance',
        'waitlisted',
        'payment',
        'futureBooking',
        'route',
        'quotedPriceInPaise',
        'basis',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'observedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'membership': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'state',
            'revision',
            'decisionId',
          ],
          'properties': <String, Object?>{
            'state': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notRequired',
                'none',
                'active',
                'revoked',
                'unavailable',
              ],
            },
            'revision': <String, Object?>{
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
            'decisionId': <String, Object?>{
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
        },
        'review': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
            'pending',
            'approved',
          ],
        },
        'admission': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
            'nativeParticipation',
            'publicPaidRoster',
            'guestRoster',
          ],
        },
        'attendance': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notRecorded',
            'attended',
          ],
        },
        'waitlisted': <String, Object?>{
          'type': 'boolean',
        },
        'payment': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notRead',
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
        'futureBooking': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'allowed',
                'reason',
              ],
              'properties': <String, Object?>{
                'allowed': <String, Object?>{
                  'const': true,
                },
                'reason': <String, Object?>{
                  'type': 'null',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'allowed',
                'reason',
              ],
              'properties': <String, Object?>{
                'allowed': <String, Object?>{
                  'const': false,
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'membershipRequired',
                    'inviteRequired',
                    'reviewRequired',
                    'full',
                    'pairCapacityUnavailable',
                    'generalCapacityUnavailable',
                    'cohortCapacityUnavailable',
                    'outOfRatioReviewRequired',
                    'balanceUnavailable',
                    'bookingDetailsRequired',
                    'runPreferencesRequired',
                    'ageRestricted',
                    'scheduleConflict',
                    'eventUnavailable',
                    'past',
                    'cancelled',
                    'unsupportedRoute',
                    'paidMembershipRequired',
                    'memberEarlyAccess',
                  ],
                },
              },
            },
          ],
        },
        'route': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchFreeBooking',
                'catchCheckout',
                'catchWaitlistOffer',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'quotedPriceInPaise': <String, Object?>{
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
        'basis': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'policyHash',
            'inventoryRevision',
            'capacityRevision',
            'migrationRevision',
          ],
          'properties': <String, Object?>{
            'policyHash': <String, Object?>{
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
            'inventoryRevision': <String, Object?>{
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
            'capacityRevision': <String, Object?>{
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
            'migrationRevision': <String, Object?>{
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
        'guest': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'action',
            'publicFormId',
            'applicationStatus',
            'offerGrantId',
            'publicPaymentId',
            'runtimeId',
            'attendeeId',
            'expiresAtMillis',
            'offerPaymentId',
          ],
          'properties': <String, Object?>{
            'action': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'registerFree',
                'bookPaid',
                'apply',
                'applicationPending',
                'applicationWaitlisted',
                'declined',
                'awaitingOffer',
                'offer',
                'registered',
                'seatWaitlisted',
                'recoverPayment',
                'closed',
                'unsupported',
                'unavailable',
              ],
            },
            'publicFormId': <String, Object?>{
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
            'applicationStatus': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'submitted',
                    'inReview',
                    'approved',
                    'waitlisted',
                    'declined',
                    'withdrawn',
                  ],
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'offerGrantId': <String, Object?>{
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
            'publicPaymentId': <String, Object?>{
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
            'runtimeId': <String, Object?>{
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
            'attendeeId': <String, Object?>{
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
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'offerPaymentId': <String, Object?>{
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
        },
        'hostMembership': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Present only when the request opted in. Server-evaluated paid membership entitlement for this viewer and event; quotedPriceInPaise is already the member price when memberPriceApplied.',
          'required': <Object?>[
            'member',
            'listPriceInPaise',
            'memberPriceApplied',
            'memberPriceBlockedReason',
            'savingsInPaise',
            'membersOnly',
            'generalSaleOpensAtMillis',
            'offer',
          ],
          'properties': <String, Object?>{
            'member': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'null',
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'membershipId',
                    'planId',
                    'planName',
                    'status',
                    'entitled',
                  ],
                  'properties': <String, Object?>{
                    'membershipId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^hm_[a-f0-9]{64}\$',
                    },
                    'planId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                    },
                    'planName': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 60,
                    },
                    'status': <String, Object?>{
                      'enum': <Object?>[
                        'trialing',
                        'active',
                        'past_due',
                        'paused',
                        'canceling',
                        'expired',
                      ],
                    },
                    'entitled': <String, Object?>{
                      'type': 'boolean',
                    },
                  },
                },
              ],
            },
            'listPriceInPaise': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'memberPriceApplied': <String, Object?>{
              'type': 'boolean',
            },
            'memberPriceBlockedReason': <String, Object?>{
              'enum': <Object?>[
                null,
                'bookingCapReached',
              ],
            },
            'savingsInPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'membersOnly': <String, Object?>{
              'type': 'boolean',
            },
            'generalSaleOpensAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'offer': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'null',
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'planId',
                    'planName',
                    'interval',
                    'planPriceInPaise',
                    'memberPriceInPaise',
                    'savingsInPaise',
                    'unlocksAccess',
                  ],
                  'properties': <String, Object?>{
                    'planId': <String, Object?>{
                      'type': 'string',
                      'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                    },
                    'planName': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 60,
                    },
                    'interval': <String, Object?>{
                      'enum': <Object?>[
                        'monthly',
                        'annual',
                      ],
                    },
                    'planPriceInPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1000,
                      'maximum': 1500000,
                      'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
                    },
                    'memberPriceInPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'savingsInPaise': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'unlocksAccess': <String, Object?>{
                      'type': 'boolean',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_viewer_state_response.schema.json',
  'title': 'GetEventViewerStateCallableResponse',
  'description': 'Current eligibility is separate from retained payment, admission and attendance evidence. Observation only; final mutations revalidate authority.',
};
