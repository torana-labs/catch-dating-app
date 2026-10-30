// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_organizer_campaign_payload.schema.json.

const schemaUpsertOrganizerCampaignCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_organizer_campaign_payload.schema.json',
  'title': 'UpsertOrganizerCampaignCallablePayload',
  'description': 'Creates or revision-updates one draft WhatsApp organizer campaign that consumes a Customers-owned saved audience id.',
  'x-callable-aliases': <Object?>[
    'upsertOrganizerCampaign',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'name',
    'messageClass',
    'savedAudienceId',
    'connectionId',
    'templateId',
    'templateVariables',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'campaignId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'expectedRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'messageClass': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventFollowUp',
        'organizerUpdate',
        'organizerPromotion',
      ],
    },
    'savedAudienceId': <String, Object?>{
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
      'description': 'Active CRM saved audience. Required for recipientSource.kind=savedAudience (the default); must be null for programSelection.',
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'templateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'templateVariables': <String, Object?>{
      'type': 'object',
      'maxProperties': 20,
      'propertyNames': <String, Object?>{
        'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
      },
      'additionalProperties': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteDestinationKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'catchEvent',
        'eventRuntime',
        'externalBooking',
        'marketingLanding',
      ],
    },
    'scheduledAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 4102444800000,
    },
    'recipientSource': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
      ],
      'description': 'Recipient resolution. Absent reads as savedAudience backed by savedAudienceId. programSelection resolves program guests/households instead of CRM contacts.',
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'savedAudience',
            'programSelection',
          ],
        },
        'programId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
          'description': 'Required when kind=programSelection; ignored otherwise.',
        },
        'functionIds': <String, Object?>{
          'type': <Object?>[
            'array',
            'null',
          ],
          'maxItems': 32,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'description': 'Restricts to guests invited to these functions; null or empty means every function in the program.',
        },
        'rsvpStatuses': <String, Object?>{
          'type': <Object?>[
            'array',
            'null',
          ],
          'maxItems': 4,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'attending',
              'declined',
              'maybe',
            ],
          },
          'description': 'Restricts to matching per-function RSVP statuses; null or empty means every effective status.',
        },
        'householdDedupe': <String, Object?>{
          'type': <Object?>[
            'boolean',
            'null',
          ],
          'description': 'When true, guests sharing a household collapse into one recipient. Default true.',
        },
      },
    },
  },
};
