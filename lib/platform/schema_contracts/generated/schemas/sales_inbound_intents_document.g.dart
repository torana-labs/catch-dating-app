// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_inbound_intents.schema.json.

const schemaSalesInboundIntentsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_inbound_intents.schema.json',
  'title': 'SalesInboundIntentDocument',
  'description': 'Private self-reported host submission, immutable at capture and linked only after identity review.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesInboundIntents',
  'x-firestore-path': 'salesInboundIntents/{intentId}',
  'x-document-id-field': 'intentId',
  'x-owner': 'joinWaitlist and adminLinkSalesInboundIntent',
  'required': <Object?>[
    'schemaVersion',
    'revision',
    'classification',
    'intentId',
    'source',
    'submissionId',
    'requestHash',
    'waitlistId',
    'status',
    'organizerId',
    'evidenceStatus',
    'fullName',
    'email',
    'city',
    'entryRoute',
    'alreadyJoined',
    'hostApplication',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'source': <String, Object?>{
      'enum': <Object?>[
        'website',
        'partner',
      ],
    },
    'submissionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'waitlistId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'needs_identity_review',
        'linked',
        'dismissed',
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'evidenceStatus': <String, Object?>{
      'const': 'self_reported',
    },
    'fullName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 100,
    },
    'email': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'email',
          'maxLength': 320,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'city': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'entryRoute': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'maxLength': 512,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'alreadyJoined': <String, Object?>{
      'type': 'boolean',
    },
    'hostApplication': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'organizationName': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 140,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'organizationType': <String, Object?>{
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
            'operatingCity': <String, Object?>{
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
            'communityLink': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 512,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'formats': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'maxLength': 80,
              },
            },
            'eventCadence': <String, Object?>{
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
            'nextEventName': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 160,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'nextEventDate': <String, Object?>{
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
            'eventLocation': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 180,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'expectedCapacity': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 40,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'bookingPlatform': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 120,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'guestListFormat': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 120,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'priceRange': <String, Object?>{
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
            'admissionModel': <String, Object?>{
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
            'waitlistPlan': <String, Object?>{
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
            'paymentReadiness': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 120,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'eventSuccessModules': <String, Object?>{
              'type': 'array',
              'maxItems': 16,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'maxLength': 120,
              },
            },
            'hostGoals': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 1000,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'operatingNotes': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'maxLength': 1000,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'eventPricing': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'paid',
                    'free',
                    'mixed',
                    'undecided',
                  ],
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
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
    'linkedAt': <String, Object?>{
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
    'linkedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'linkRequestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'partnerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'hostLead': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'isNew',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'pattern': '^host_lead_[0-9]{13}_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\$',
        },
        'isNew': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'acquisitionAttribution': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Optional first-party campaign snapshot captured with the new Host receipt under current analytics permission. Erased on withdrawal or original-choice expiry; never used without a current consent/privacy check.',
      'required': <Object?>[
        'version',
        'consentId',
        'acceptedAt',
        'expiresAt',
        'firstTouch',
        'lastTouch',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'const': 1,
        },
        'consentId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'acceptedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'expiresAt': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'firstTouch': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'capturedAt',
                'landingPath',
                'values',
              ],
              'properties': <String, Object?>{
                'capturedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'landingPath': <String, Object?>{
                  'enum': <Object?>[
                    '/host/',
                    '/host/overview/',
                    '/host/platform/',
                    '/host/planners/',
                    '/host/clubs/',
                    '/host/directory/',
                    '/claim/',
                    '/host/claim/',
                    '/host/apply/',
                    '/host/stack/',
                    '/host/workflows/',
                  ],
                },
                'values': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'minProperties': 1,
                  'properties': <String, Object?>{
                    'utm_source': <String, Object?>{
                      'enum': <Object?>[
                        'google',
                        'meta',
                        'newsletter',
                        'catch',
                        'partner',
                      ],
                    },
                    'utm_medium': <String, Object?>{
                      'enum': <Object?>[
                        'cpc',
                        'paid_social',
                        'email',
                        'organic',
                        'referral',
                      ],
                    },
                    'utm_campaign': <String, Object?>{
                      'enum': <Object?>[
                        'launch',
                        'launch_2026',
                        'planner_launch',
                        'host_acquisition_2026',
                        'synthetic_launch',
                      ],
                    },
                    'utm_content': <String, Object?>{
                      'enum': <Object?>[
                        'host_hero',
                        'host_footer',
                        'claim_cta',
                        'application_cta',
                      ],
                    },
                  },
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'lastTouch': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'capturedAt',
                'landingPath',
                'values',
              ],
              'properties': <String, Object?>{
                'capturedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'landingPath': <String, Object?>{
                  'enum': <Object?>[
                    '/host/',
                    '/host/overview/',
                    '/host/platform/',
                    '/host/planners/',
                    '/host/clubs/',
                    '/host/directory/',
                    '/claim/',
                    '/host/claim/',
                    '/host/apply/',
                    '/host/stack/',
                    '/host/workflows/',
                  ],
                },
                'values': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'minProperties': 1,
                  'properties': <String, Object?>{
                    'utm_source': <String, Object?>{
                      'enum': <Object?>[
                        'google',
                        'meta',
                        'newsletter',
                        'catch',
                        'partner',
                      ],
                    },
                    'utm_medium': <String, Object?>{
                      'enum': <Object?>[
                        'cpc',
                        'paid_social',
                        'email',
                        'organic',
                        'referral',
                      ],
                    },
                    'utm_campaign': <String, Object?>{
                      'enum': <Object?>[
                        'launch',
                        'launch_2026',
                        'planner_launch',
                        'host_acquisition_2026',
                        'synthetic_launch',
                      ],
                    },
                    'utm_content': <String, Object?>{
                      'enum': <Object?>[
                        'host_hero',
                        'host_footer',
                        'claim_cta',
                        'application_cta',
                      ],
                    },
                  },
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'const': 'linked',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'linkedAt',
          'linkedBy',
          'linkRequestId',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 128,
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'source': <String, Object?>{
            'const': 'partner',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'partnerUid',
        ],
        'properties': <String, Object?>{
          'email': <String, Object?>{
            'type': 'null',
          },
          'entryRoute': <String, Object?>{
            'const': '/partners/',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'email': <String, Object?>{
            'type': 'string',
            'format': 'email',
          },
          'partnerUid': false,
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'hostAttributionTouch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'capturedAt',
        'landingPath',
        'values',
      ],
      'properties': <String, Object?>{
        'capturedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'landingPath': <String, Object?>{
          'enum': <Object?>[
            '/host/',
            '/host/overview/',
            '/host/platform/',
            '/host/planners/',
            '/host/clubs/',
            '/host/directory/',
            '/claim/',
            '/host/claim/',
            '/host/apply/',
            '/host/stack/',
            '/host/workflows/',
          ],
        },
        'values': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'minProperties': 1,
          'properties': <String, Object?>{
            'utm_source': <String, Object?>{
              'enum': <Object?>[
                'google',
                'meta',
                'newsletter',
                'catch',
                'partner',
              ],
            },
            'utm_medium': <String, Object?>{
              'enum': <Object?>[
                'cpc',
                'paid_social',
                'email',
                'organic',
                'referral',
              ],
            },
            'utm_campaign': <String, Object?>{
              'enum': <Object?>[
                'launch',
                'launch_2026',
                'planner_launch',
                'host_acquisition_2026',
                'synthetic_launch',
              ],
            },
            'utm_content': <String, Object?>{
              'enum': <Object?>[
                'host_hero',
                'host_footer',
                'claim_cta',
                'application_cta',
              ],
            },
          },
        },
      },
    },
  },
};
