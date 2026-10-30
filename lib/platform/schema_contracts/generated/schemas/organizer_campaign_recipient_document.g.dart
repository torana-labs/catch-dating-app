// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_campaign_recipients.schema.json.

const schemaOrganizerCampaignRecipientDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_campaign_recipients.schema.json',
  'title': 'OrganizerCampaignRecipientDocument',
  'description': 'Frozen recipient eligibility and monotonic delivery receipt for one organizer campaign contact.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerCampaignRecipients',
  'x-firestore-path': 'organizerCampaignRecipients/{recipientId}',
  'x-document-id-field': 'recipientId',
  'x-owner': 'campaign approval, dispatcher and provider webhook',
  'required': <Object?>[
    'organizerId',
    'campaignId',
    'contactId',
    'channel',
    'eligibility',
    'exclusionReason',
    'endpointE164',
    'endpointHash',
    'permissionTermsVersion',
    'permissionUpdatedAt',
    'renderedVariablesHash',
    'inviteLinkId',
    'status',
    'providerMessageId',
    'providerErrorCategory',
    'retryEligible',
    'attemptCount',
    'leaseOwner',
    'leaseExpiresAt',
    'acceptedAt',
    'sentAt',
    'deliveredAt',
    'readAt',
    'failedAt',
    'repliedAt',
    'optedOutAt',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'campaignId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
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
      'description': 'CRM contact for saved-audience recipients; null on programSelection rows — program identity lives in programRecipient.',
    },
    'programRecipient': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'programId',
        'recipientKey',
        'guestIds',
        'householdId',
        'endpointGuestId',
        'messagingConsent',
      ],
      'description': 'Program-native recipient identity for recipientSource=programSelection campaigns. One doc per resolved recipientKey (guest:{id} or household:{id}); contactId is null on these rows.',
      'properties': <String, Object?>{
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'recipientKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 220,
          'description': 'guest:{guestId} or household:{householdId}; hashed into the document id in place of contactId.',
        },
        'guestIds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 50,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'description': 'Program guests covered by this recipient; one for guest recipients, household members for deduped rows.',
        },
        'householdId': <String, Object?>{
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
          'description': 'Household carrying messaging consent for this recipient — the dedupe household for household:{id} rows or the guest\'s household otherwise.',
        },
        'endpointGuestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'messagingConsent': <String, Object?>{
          'type': <Object?>[
            'object',
            'null',
          ],
          'additionalProperties': false,
          'required': <Object?>[
            'granted',
            'grantedAt',
            'source',
          ],
          'properties': <String, Object?>{
            'granted': <String, Object?>{
              'type': 'boolean',
            },
            'grantedAt': <String, Object?>{
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
            'source': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                'householdRsvpLink',
                'staff',
                'import',
                'whatsappStop',
                null,
              ],
            },
          },
          'description': 'Snapshot of the household\'s explicit messaging consent at approve time; grant decisions re-read live at dispatch.',
        },
      },
    },
    'channel': <String, Object?>{
      'const': 'whatsapp',
    },
    'eligibility': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eligible',
        'excluded',
      ],
    },
    'exclusionReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'optedOut',
        'noVerifiedEndpoint',
        'duplicateEndpoint',
        'frequencyCapped',
        'providerBlocked',
        'invalidEndpoint',
        'unknownPermission',
        'identityUnresolved',
        'deleted',
      ],
    },
    'endpointE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'endpointHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'permissionTermsVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'permissionUpdatedAt': <String, Object?>{
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
    'renderedVariablesHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'inviteLinkId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'sending',
        'suppressed',
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed',
        'replied',
        'optedOut',
      ],
    },
    'providerMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'providerErrorCategory': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'authentication',
        'template',
        'quality',
        'rateLimit',
        'invalidRecipient',
        'policy',
        'provider',
        'unknown',
      ],
    },
    'retryEligible': <String, Object?>{
      'type': 'boolean',
    },
    'attemptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 20,
    },
    'leaseOwner': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'leaseExpiresAt': <String, Object?>{
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
    'acceptedAt': <String, Object?>{
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
    'sentAt': <String, Object?>{
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
    'deliveredAt': <String, Object?>{
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
    'readAt': <String, Object?>{
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
    'failedAt': <String, Object?>{
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
    'repliedAt': <String, Object?>{
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
    'optedOutAt': <String, Object?>{
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
  },
};
