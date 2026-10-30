// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_attention_items_response.schema.json.

const schemaListOrganizerAttentionItemsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_attention_items_response.schema.json',
  'title': 'ListOrganizerAttentionItemsCallableResponse',
  'description': 'Complete supported Host Today attention items plus explicit coverage for client-merged, shortcut-only, and blocked-missing-truth kinds.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'policyVersion',
    'generatedAtMillis',
    'horizonEndsAtMillis',
    'items',
    'coverage',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'policyVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'horizonEndsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'attentionId',
          'kind',
          'scope',
          'sourceOwner',
          'sourceId',
          'sourceRevision',
          'eventId',
          'status',
          'consequence',
          'blocking',
          'urgency',
          'destination',
          'context',
          'dedupeKey',
          'policyVersion',
          'resolutionVersion',
          'assignedHostUid',
          'openedAtMillis',
          'dueAtMillis',
          'expiresAtMillis',
        ],
        'properties': <String, Object?>{
          'attentionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'eventLiveOperations',
              'eventAssistanceCaseReview',
              'eventAssistanceDeliveryReview',
              'eventWaitlistReview',
              'eventJoinRequestReview',
              'applicationReview',
              'providerSyncFailure',
              'formAutomationFailure',
              'payoutSetup',
              'attendanceSync',
              'dressRehearsal',
              'eventSuccessPreparation',
              'roomLayoutSetup',
              'eventStaffing',
              'formResponseReview',
              'inboxReply',
              'postEventReconciliation',
              'momentStaffAttention',
              'eventOfferPaymentFollowUp',
            ],
            'x-catch-catalog': '../catalogs/host_attention_policies.json',
          },
          'scope': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizer',
              'event',
              'application',
              'form',
              'thread',
              'account',
            ],
          },
          'sourceOwner': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'events',
              'eventParticipations',
              'organizerApplications',
              'providerSyncRuns',
              'organizerFormAutomationRuns',
              'hostPaymentAccounts',
              'hostAttendanceOutbox',
              'eventAssistanceCases',
              'operationWorkItems',
              'eventSuccessPlans',
              'eventRehearsals',
              'eventStaffGrants',
              'organizerFormResponses',
              'organizerWhatsappThreads',
              'eventAttendees',
              'organizerMomentSends',
              'organizerEventOffers',
            ],
          },
          'sourceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'sourceRevision': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'eventId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'status': <String, Object?>{
            'const': 'open',
          },
          'consequence': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'blocksLiveOperation',
              'risksGuestExperience',
              'risksRevenue',
              'delaysResponse',
              'degradesAutomation',
              'requiresReconciliation',
              'preparationIncomplete',
              'informational',
            ],
          },
          'blocking': <String, Object?>{
            'type': 'boolean',
          },
          'urgency': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'immediate',
              'soon',
              'upcoming',
            ],
          },
          'destination': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'route',
              'section',
              'eventId',
              'applicationId',
              'formId',
              'threadId',
            ],
            'properties': <String, Object?>{
              'route': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'hostEventManage',
                  'hostApplications',
                  'hostOrganizerPayments',
                  'hostAudienceForms',
                  'hostInbox',
                  'hostDressRehearsal',
                  'hostEvents',
                  'hostProgramWork',
                ],
              },
              'section': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
              },
              'eventId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'applicationId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'formId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
              'threadId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
              },
            },
          },
          'context': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'eventName',
              'subjectLabel',
              'count',
              'provider',
              'errorCode',
            ],
            'properties': <String, Object?>{
              'eventName': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 160,
              },
              'subjectLabel': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 160,
              },
              'count': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
                'maximum': 1000000000,
              },
              'provider': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
              },
              'errorCode': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 120,
              },
            },
          },
          'dedupeKey': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'policyVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'resolutionVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'assignedHostUid': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'openedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'dueAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'expiresAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'coverage': <String, Object?>{
      'type': 'array',
      'minItems': 19,
      'maxItems': 19,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'kind',
          'state',
          'reason',
        ],
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'eventLiveOperations',
              'eventAssistanceCaseReview',
              'eventAssistanceDeliveryReview',
              'eventWaitlistReview',
              'eventJoinRequestReview',
              'applicationReview',
              'providerSyncFailure',
              'formAutomationFailure',
              'payoutSetup',
              'attendanceSync',
              'dressRehearsal',
              'eventSuccessPreparation',
              'roomLayoutSetup',
              'eventStaffing',
              'formResponseReview',
              'inboxReply',
              'postEventReconciliation',
              'momentStaffAttention',
              'eventOfferPaymentFollowUp',
            ],
            'x-catch-catalog': '../catalogs/host_attention_policies.json',
          },
          'state': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'complete',
              'clientMergeRequired',
              'shortcutOnly',
              'blockedMissingTruth',
            ],
          },
          'reason': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
        },
      },
    },
  },
};
