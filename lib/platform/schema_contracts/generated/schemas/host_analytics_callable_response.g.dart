// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/host_analytics_response.schema.json.

const schemaHostAnalyticsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/host_analytics_response.schema.json',
  'title': 'HostAnalyticsCallableResponse',
  'description': 'Shared aggregate analytics response returned by host and admin analytics callables. Values are aggregate-only and host-safe.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'generatedAt',
    'timezone',
    'range',
    'scope',
    'summaryCards',
    'trend',
    'topEvents',
    'reviewSummary',
    'discoverySummary',
    'linkSummary',
    'dataQuality',
  ],
  'properties': <String, Object?>{
    'generatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
    },
    'range': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'startDate',
        'endDate',
        'granularity',
      ],
      'properties': <String, Object?>{
        'startDate': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'endDate': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'granularity': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'day',
            'week',
            'month',
          ],
        },
        'preset': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 24,
        },
      },
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerIds',
        'eventIds',
      ],
      'properties': <String, Object?>{
        'organizerIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'eventIds': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'organizerName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'eventTitle': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
      },
    },
    'summaryCards': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'value',
          'unit',
          'status',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'value': <String, Object?>{
            'type': 'number',
          },
          'unit': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'count',
              'percent',
              'money_minor',
              'rating',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ready',
              'partial',
              'missing',
            ],
          },
          'caption': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'previousValue': <String, Object?>{
            'type': <Object?>[
              'number',
              'null',
            ],
          },
        },
      },
    },
    'trend': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'periodStart',
          'periodEnd',
          'metrics',
        ],
        'properties': <String, Object?>{
          'periodStart': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'periodEnd': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'metrics': <String, Object?>{
            'type': 'object',
            'additionalProperties': <String, Object?>{
              'type': 'number',
            },
          },
        },
      },
    },
    'topEvents': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventId',
          'organizerId',
          'title',
          'startTime',
          'status',
          'capacityLimit',
          'bookedCount',
          'checkedInCount',
          'waitlistedCount',
          'fillRate',
          'checkInRate',
          'grossRevenueMinor',
          'currency',
          'checkoutStartedCount',
          'checkoutDropoffCount',
          'paymentCompletedCount',
          'paymentFailedCount',
          'paymentRefundedCount',
          'reviewCount',
          'averageRating',
          'demandCount',
          'inviteOpenCount',
          'mutualMatchCount',
          'chatStartedCount',
          'repeatAttendeeCount',
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
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'startTime': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'status': <String, Object?>{
            'type': 'string',
            'maxLength': 48,
          },
          'capacityLimit': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'bookedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'checkedInCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'waitlistedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'fillRate': <String, Object?>{
            'type': 'number',
            'minimum': 0,
          },
          'checkInRate': <String, Object?>{
            'type': 'number',
            'minimum': 0,
          },
          'grossRevenueMinor': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'currency': <String, Object?>{
            'type': 'string',
            'minLength': 3,
            'maxLength': 3,
          },
          'checkoutStartedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'checkoutDropoffCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'paymentCompletedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'paymentFailedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'paymentRefundedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'reviewCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'averageRating': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 5,
          },
          'demandCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'inviteOpenCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'mutualMatchCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'chatStartedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'repeatAttendeeCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'operationalAttendeeCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'operationalCheckedInCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'attendeeSources': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'catchBooking',
              'hostImport',
              'hostManual',
              'webOtp',
              'providerSync',
            ],
            'properties': <String, Object?>{
              'catchBooking': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'hostImport': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'hostManual': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'webOtp': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'providerSync': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
      },
    },
    'reviewSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'newReviews',
        'publishedReviews',
        'verifiedReviews',
        'publicReviews',
        'ownerResponseCount',
        'averageRating',
      ],
      'properties': <String, Object?>{
        'newReviews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'publishedReviews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'verifiedReviews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'publicReviews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'ownerResponseCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'averageRating': <String, Object?>{
          'type': 'number',
          'minimum': 0,
          'maximum': 5,
        },
      },
    },
    'discoverySummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'listingViews',
        'searchAppearances',
        'eventViews',
        'organizerSaves',
        'eventSaves',
        'contactClicks',
        'claimClicks',
        'outboundClicks',
        'linkClicks',
      ],
      'properties': <String, Object?>{
        'listingViews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'searchAppearances': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'eventViews': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'organizerSaves': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'eventSaves': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'contactClicks': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'claimClicks': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'outboundClicks': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'linkClicks': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'linkSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Owner link clicks in the range (CAT-254): each link\'s total, most clicked first, and where the clicking visitors came from. Event-scoped reports have none.',
      'required': <Object?>[
        'links',
        'trafficSources',
      ],
      'properties': <String, Object?>{
        'links': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'organizerId',
              'linkId',
              'label',
              'clicks',
            ],
            'properties': <String, Object?>{
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'linkId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
                'description': 'The link\'s current label; null once the owner has removed it.',
              },
              'clicks': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
        'trafficSources': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'source',
              'clicks',
            ],
            'properties': <String, Object?>{
              'source': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'instagram',
                  'whatsapp',
                  'facebook',
                  'google',
                  'qr',
                  'email',
                  'direct',
                  'other',
                ],
              },
              'clicks': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
      },
    },
    'dataQuality': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'state',
          'detail',
          'owner',
          'runbook',
          'nextAction',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'state': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ok',
              'partial',
              'missing',
            ],
          },
          'detail': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'owner': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'runbook': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 200,
          },
          'nextAction': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'metricCard': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'label',
        'value',
        'unit',
        'status',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'value': <String, Object?>{
          'type': 'number',
        },
        'unit': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'count',
            'percent',
            'money_minor',
            'rating',
          ],
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ready',
            'partial',
            'missing',
          ],
        },
        'caption': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'previousValue': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
        },
      },
    },
  },
};
