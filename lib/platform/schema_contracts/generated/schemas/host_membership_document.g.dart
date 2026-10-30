// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_memberships.schema.json.

const schemaHostMembershipDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_memberships.schema.json',
  'title': 'HostMembershipDocument',
  'description': 'One member\'s paid membership with one organizer, keyed hm_<sha256([organizerId, uid])> so a rejoining member keeps tenure. Written only by the membership state machine from verified provider evidence and member/host intents. Distinct from organizerCommunityMemberships (unpaid approval grants).',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMemberships',
  'x-firestore-path': 'hostMemberships/{membershipId}',
  'x-document-id-field': 'membershipId',
  'x-owner': 'host membership state machine (webhook, checkout refresh, self-serve and billing-pause callables)',
  'required': <Object?>[
    'schemaVersion',
    'organizerId',
    'uid',
    'planId',
    'planName',
    'interval',
    'status',
    'statusReason',
    'priceInPaise',
    'currency',
    'currentPeriodStartMillis',
    'currentPeriodEndMillis',
    'trialEndsAtMillis',
    'cancelAtPeriodEnd',
    'pause',
    'pastDueSinceMillis',
    'memberSinceMillis',
    'tenure',
    'provider',
    'providerSubscriptionId',
    'providerPlanId',
    'providerEventAtMillis',
    'lastCheckoutId',
    'revision',
    'createdAtMillis',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
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
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^hmp_[A-Za-z0-9]{20}\$',
      'x-catch-ownership': 'server-only',
    },
    'planName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
      'x-catch-ownership': 'server-only',
    },
    'interval': <String, Object?>{
      'enum': <Object?>[
        'monthly',
        'annual',
      ],
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'statusReason': <String, Object?>{
      'enum': <Object?>[
        null,
        'memberPaused',
        'hostPaused',
        'paymentFailed',
        'memberCanceled',
        'planCompleted',
        'providerCanceled',
      ],
      'x-catch-ownership': 'server-only',
    },
    'priceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 1000,
      'maximum': 1500000,
      'description': 'INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.',
      'x-catch-ownership': 'server-only',
    },
    'currency': <String, Object?>{
      'const': 'INR',
      'x-catch-ownership': 'server-only',
    },
    'currentPeriodStartMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'currentPeriodEndMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'trialEndsAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'cancelAtPeriodEnd': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'pause': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'initiator',
            'pausedAtMillis',
          ],
          'properties': <String, Object?>{
            'initiator': <String, Object?>{
              'enum': <Object?>[
                'member',
                'host',
              ],
            },
            'pausedAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
          },
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'pastDueSinceMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'memberSinceMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'tenure': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'accumulatedMillis',
        'stretchStartedAtMillis',
      ],
      'properties': <String, Object?>{
        'accumulatedMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'stretchStartedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
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
    'providerPlanId': <String, Object?>{
      'type': 'string',
      'pattern': '^plan_[A-Za-z0-9]{6,40}\$',
      'x-catch-ownership': 'server-only',
    },
    'payment': <String, Object?>{
      'description': 'The account that owns this subscription, copied from the checkout that created it. Absent on memberships created under the original platform-account model.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'provider',
        'moneyFlow',
        'providerAccountId',
        'bindingId',
        'mode',
      ],
      'properties': <String, Object?>{
        'provider': <String, Object?>{
          'enum': <Object?>[
            'razorpay',
          ],
        },
        'moneyFlow': <String, Object?>{
          'description': 'hostCollected: the guest pays the organizer\'s own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch\'s platform account collects and transfers the organizer\'s share (Razorpay Route), deducting any at-source fee.',
          'enum': <Object?>[
            'hostCollected',
            'platformSplit',
          ],
        },
        'providerAccountId': <String, Object?>{
          'type': 'string',
          'pattern': '^acc_[A-Za-z0-9]{4,40}\$',
        },
        'bindingId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'mode': <String, Object?>{
          'enum': <Object?>[
            'test',
            'live',
          ],
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'providerEventAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'lastCheckoutId': <String, Object?>{
      'type': 'string',
      'pattern': '^hmc_[A-Za-z0-9]{20}\$',
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740990,
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
