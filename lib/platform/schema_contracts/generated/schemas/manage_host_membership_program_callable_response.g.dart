// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_host_membership_program_response.schema.json.

const schemaManageHostMembershipProgramCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_host_membership_program_response.schema.json',
  'title': 'ManageHostMembershipProgramCallableResponse',
  'description': 'Bounded program projection plus readiness facts the host settings screen needs before enabling memberships. routeAccountReady means the payment account the effective money flow needs is ready (a connected Razorpay account for hostCollected, the Route linked account for platformSplit); feeConfigured means Catch\'s commercial terms resolve. unavailableReason names the first blocker.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'program',
    'routeAccountReady',
    'feeConfigured',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'program': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'state',
            'provider',
            'mode',
            'billingPauseState',
            'memberCount',
            'revision',
          ],
          'properties': <String, Object?>{
            'state': <String, Object?>{
              'enum': <Object?>[
                'enabled',
                'disabled',
              ],
            },
            'provider': <String, Object?>{
              'enum': <Object?>[
                'razorpay',
              ],
            },
            'mode': <String, Object?>{
              'enum': <Object?>[
                'test',
                'live',
              ],
            },
            'billingPauseState': <String, Object?>{
              'enum': <Object?>[
                'active',
                'pausing',
                'paused',
                'resuming',
              ],
            },
            'memberCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 10000000,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740990,
            },
          },
        },
      ],
    },
    'routeAccountReady': <String, Object?>{
      'type': 'boolean',
    },
    'feeConfigured': <String, Object?>{
      'type': 'boolean',
    },
    'paymentMode': <String, Object?>{
      'description': 'The organizer\'s effective membership money flow, or null when Catch has not offered memberships to this organizer.',
      'anyOf': <Object?>[
        <String, Object?>{
          'description': 'hostCollected: the guest pays the organizer\'s own merchant account and the organizer is merchant of record; Catch bills its commission afterwards. platformSplit: Catch\'s platform account collects and transfers the organizer\'s share (Razorpay Route), deducting any at-source fee.',
          'enum': <Object?>[
            'hostCollected',
            'platformSplit',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'unavailableReason': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'enum': <Object?>[
            'notOffered',
            'termsNotConfigured',
            'razorpayNotConnected',
            'razorpayNeedsAttention',
            'subscriptionsNotEnabled',
            'payoutAccountNotReady',
            'providerUnavailable',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
