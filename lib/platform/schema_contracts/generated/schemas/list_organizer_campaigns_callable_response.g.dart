// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_campaigns_response.schema.json.

const schemaListOrganizerCampaignsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_campaigns_response.schema.json',
  'title': 'ListOrganizerCampaignsCallableResponse',
  'description': 'Reverse-chronological organizer Sends rows mixing WhatsApp campaigns, event announcements, and follower updates.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'sends',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sends': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'oneOf': <Object?>[
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'campaignId',
              'name',
              'status',
              'savedAudienceId',
              'savedAudienceName',
              'segmentIds',
              'templateId',
              'templateName',
              'audienceCounts',
              'deliveryCounts',
              'scheduledAtMillis',
              'dispatchedAtMillis',
              'activityAtMillis',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'campaign',
              },
              'campaignId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'name': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'draft',
                  'previewed',
                  'approved',
                  'scheduled',
                  'resolving',
                  'sending',
                  'completed',
                  'partiallyFailed',
                  'cancelled',
                  'blocked',
                ],
              },
              'savedAudienceId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
              },
              'savedAudienceName': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 80,
              },
              'segmentIds': <String, Object?>{
                'type': 'array',
                'maxItems': 5,
                'uniqueItems': true,
                'description': 'Legacy read compatibility only. New campaign writes use savedAudienceId and persist an empty array.',
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'first_time_attendee',
                    'repeat_attendee',
                    'regular',
                    'lapsed_regular',
                    'reliable_attendee',
                    'advocate',
                    'high_impact_advocate',
                    'whatsapp_reachable',
                  ],
                },
              },
              'templateId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'templateName': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 120,
              },
              'audienceCounts': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'total',
                  'reachable',
                  'optedOut',
                  'invalid',
                  'duplicate',
                  'unsupported',
                  'frequencyCapped',
                  'providerBlocked',
                  'unknown',
                ],
                'properties': <String, Object?>{
                  'total': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'reachable': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'optedOut': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'invalid': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'duplicate': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'unsupported': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'frequencyCapped': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'providerBlocked': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'unknown': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                },
              },
              'deliveryCounts': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'pending',
                  'suppressed',
                  'accepted',
                  'sent',
                  'delivered',
                  'read',
                  'failed',
                  'replied',
                  'optedOut',
                ],
                'properties': <String, Object?>{
                  'pending': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'suppressed': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'accepted': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'sent': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'delivered': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'read': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'failed': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'replied': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                  'optedOut': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 1000000,
                  },
                },
              },
              'scheduledAtMillis': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
              },
              'dispatchedAtMillis': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
              },
              'activityAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'broadcastId',
              'eventId',
              'eventName',
              'audience',
              'recipientCount',
              'sentAtMillis',
              'partialFailure',
              'activityAtMillis',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'announcement',
              },
              'broadcastId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'eventId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'eventName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'audience': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'booked',
                  'prospective',
                  'everyone',
                ],
              },
              'recipientCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 500,
              },
              'sentAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'partialFailure': <String, Object?>{
                'type': 'boolean',
              },
              'activityAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
          <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
              'postId',
              'eventId',
              'audience',
              'status',
              'deliveryStatus',
              'recipientCount',
              'excludedCount',
              'activityAvailableCount',
              'pushAttemptedCount',
              'pushAcceptedCount',
              'pushFailedCount',
              'pushUnknownCount',
              'createdAtMillis',
              'activityAtMillis',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'followerUpdate',
              },
              'postId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'eventId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
              },
              'audience': <String, Object?>{
                'const': 'followers',
              },
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'active',
                  'removed',
                ],
                'x-catch-ownership': 'callable-owned',
              },
              'deliveryStatus': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'pending',
                  'completed',
                  'partial',
                  'unknown',
                ],
              },
              'recipientCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'excludedCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'activityAvailableCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'pushAttemptedCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'pushAcceptedCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'pushFailedCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'pushUnknownCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'createdAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'activityAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        ],
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
  'definitions': <String, Object?>{
    'send': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'campaignId',
            'name',
            'status',
            'savedAudienceId',
            'savedAudienceName',
            'segmentIds',
            'templateId',
            'templateName',
            'audienceCounts',
            'deliveryCounts',
            'scheduledAtMillis',
            'dispatchedAtMillis',
            'activityAtMillis',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'campaign',
            },
            'campaignId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'draft',
                'previewed',
                'approved',
                'scheduled',
                'resolving',
                'sending',
                'completed',
                'partiallyFailed',
                'cancelled',
                'blocked',
              ],
            },
            'savedAudienceId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 180,
            },
            'savedAudienceName': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
            },
            'segmentIds': <String, Object?>{
              'type': 'array',
              'maxItems': 5,
              'uniqueItems': true,
              'description': 'Legacy read compatibility only. New campaign writes use savedAudienceId and persist an empty array.',
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'first_time_attendee',
                  'repeat_attendee',
                  'regular',
                  'lapsed_regular',
                  'reliable_attendee',
                  'advocate',
                  'high_impact_advocate',
                  'whatsapp_reachable',
                ],
              },
            },
            'templateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'templateName': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 120,
            },
            'audienceCounts': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'total',
                'reachable',
                'optedOut',
                'invalid',
                'duplicate',
                'unsupported',
                'frequencyCapped',
                'providerBlocked',
                'unknown',
              ],
              'properties': <String, Object?>{
                'total': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'reachable': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'optedOut': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'invalid': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'duplicate': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'unsupported': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'frequencyCapped': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'providerBlocked': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'unknown': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
              },
            },
            'deliveryCounts': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'pending',
                'suppressed',
                'accepted',
                'sent',
                'delivered',
                'read',
                'failed',
                'replied',
                'optedOut',
              ],
              'properties': <String, Object?>{
                'pending': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'suppressed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'accepted': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'sent': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'delivered': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'read': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'failed': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'replied': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
                'optedOut': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000,
                },
              },
            },
            'scheduledAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
            },
            'dispatchedAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
            },
            'activityAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'broadcastId',
            'eventId',
            'eventName',
            'audience',
            'recipientCount',
            'sentAtMillis',
            'partialFailure',
            'activityAtMillis',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'announcement',
            },
            'broadcastId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'eventName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'audience': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'booked',
                'prospective',
                'everyone',
              ],
            },
            'recipientCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 500,
            },
            'sentAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'partialFailure': <String, Object?>{
              'type': 'boolean',
            },
            'activityAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'postId',
            'eventId',
            'audience',
            'status',
            'deliveryStatus',
            'recipientCount',
            'excludedCount',
            'activityAvailableCount',
            'pushAttemptedCount',
            'pushAcceptedCount',
            'pushFailedCount',
            'pushUnknownCount',
            'createdAtMillis',
            'activityAtMillis',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'followerUpdate',
            },
            'postId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'eventId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 180,
            },
            'audience': <String, Object?>{
              'const': 'followers',
            },
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'active',
                'removed',
              ],
              'x-catch-ownership': 'callable-owned',
            },
            'deliveryStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'pending',
                'completed',
                'partial',
                'unknown',
              ],
            },
            'recipientCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'excludedCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'activityAvailableCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'pushAttemptedCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'pushAcceptedCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'pushFailedCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'pushUnknownCount': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'createdAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'activityAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
      ],
    },
    'campaign': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'campaignId',
        'name',
        'status',
        'savedAudienceId',
        'savedAudienceName',
        'segmentIds',
        'templateId',
        'templateName',
        'audienceCounts',
        'deliveryCounts',
        'scheduledAtMillis',
        'dispatchedAtMillis',
        'activityAtMillis',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'campaign',
        },
        'campaignId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'draft',
            'previewed',
            'approved',
            'scheduled',
            'resolving',
            'sending',
            'completed',
            'partiallyFailed',
            'cancelled',
            'blocked',
          ],
        },
        'savedAudienceId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
        'savedAudienceName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
        'segmentIds': <String, Object?>{
          'type': 'array',
          'maxItems': 5,
          'uniqueItems': true,
          'description': 'Legacy read compatibility only. New campaign writes use savedAudienceId and persist an empty array.',
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'first_time_attendee',
              'repeat_attendee',
              'regular',
              'lapsed_regular',
              'reliable_attendee',
              'advocate',
              'high_impact_advocate',
              'whatsapp_reachable',
            ],
          },
        },
        'templateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'templateName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 120,
        },
        'audienceCounts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'total',
            'reachable',
            'optedOut',
            'invalid',
            'duplicate',
            'unsupported',
            'frequencyCapped',
            'providerBlocked',
            'unknown',
          ],
          'properties': <String, Object?>{
            'total': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'reachable': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'optedOut': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'invalid': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'duplicate': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'unsupported': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'frequencyCapped': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'providerBlocked': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'unknown': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
          },
        },
        'deliveryCounts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'pending',
            'suppressed',
            'accepted',
            'sent',
            'delivered',
            'read',
            'failed',
            'replied',
            'optedOut',
          ],
          'properties': <String, Object?>{
            'pending': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'suppressed': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'accepted': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'sent': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'delivered': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'read': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'failed': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'replied': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'optedOut': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
          },
        },
        'scheduledAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'dispatchedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'activityAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'announcement': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'broadcastId',
        'eventId',
        'eventName',
        'audience',
        'recipientCount',
        'sentAtMillis',
        'partialFailure',
        'activityAtMillis',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'announcement',
        },
        'broadcastId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'audience': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'booked',
            'prospective',
            'everyone',
          ],
        },
        'recipientCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 500,
        },
        'sentAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'partialFailure': <String, Object?>{
          'type': 'boolean',
        },
        'activityAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'followerUpdate': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'postId',
        'eventId',
        'audience',
        'status',
        'deliveryStatus',
        'recipientCount',
        'excludedCount',
        'activityAvailableCount',
        'pushAttemptedCount',
        'pushAcceptedCount',
        'pushFailedCount',
        'pushUnknownCount',
        'createdAtMillis',
        'activityAtMillis',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'followerUpdate',
        },
        'postId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
        'audience': <String, Object?>{
          'const': 'followers',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'removed',
          ],
          'x-catch-ownership': 'callable-owned',
        },
        'deliveryStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pending',
            'completed',
            'partial',
            'unknown',
          ],
        },
        'recipientCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'excludedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'activityAvailableCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'pushAttemptedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'pushAcceptedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'pushFailedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'pushUnknownCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'createdAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'activityAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
