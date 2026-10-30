// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_whatsapp_permissions.schema.json.

const schemaEventWhatsappPermissionDocumentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'permissionId',
        'revision',
        'context',
        'attendeeId',
        'attendeeGeneration',
        'senderId',
        'routeId',
        'purpose',
        'phoneE164',
        'recipientEndpointId',
        'status',
        'evidence',
        'expiresAt',
        'updatedAt',
        'currentReceiptId',
        'sender',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'permissionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'organizerId',
            'eventId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'organizerEventWhatsapp',
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'const': 'eventService',
        },
        'phoneE164': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'granted',
        },
        'evidence': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'receiptId',
            'copyVersion',
            'acceptedAt',
            'phoneVerifiedAt',
            'subjectUid',
            'senderHash',
          ],
          'properties': <String, Object?>{
            'receiptId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'copyVersion': <String, Object?>{
              'type': 'string',
              'const': 'catch-event-service-whatsapp-v1',
            },
            'acceptedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'phoneVerifiedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'subjectUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'senderHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        'expiresAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'updatedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'currentReceiptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sender': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'providerAccountId',
            'providerPhoneNumberId',
            'displayName',
            'displayPhoneNumber',
          ],
          'properties': <String, Object?>{
            'providerAccountId': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{5,40}\$',
            },
            'providerPhoneNumberId': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{5,40}\$',
            },
            'displayName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'displayPhoneNumber': <String, Object?>{
              'type': 'string',
              'minLength': 7,
              'maxLength': 32,
            },
          },
        },
        'recipientBinding': <String, Object?>{
          'type': 'object',
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'subjectUid',
                'sourceGeneration',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'rosterPhone',
                },
                'subjectUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceGeneration': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'subjectUid',
                'sourceGeneration',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'privateVerifiedPhone',
                },
                'subjectUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceGeneration': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          ],
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'permissionId',
        'revision',
        'context',
        'attendeeId',
        'attendeeGeneration',
        'senderId',
        'routeId',
        'purpose',
        'phoneE164',
        'recipientEndpointId',
        'status',
        'evidence',
        'expiresAt',
        'updatedAt',
        'currentReceiptId',
        'sender',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'permissionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'organizerId',
            'eventId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'routeId': <String, Object?>{
          'type': 'string',
          'const': 'organizerEventWhatsapp',
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'const': 'eventService',
        },
        'phoneE164': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'status': <String, Object?>{
          'type': 'string',
          'const': 'revoked',
        },
        'evidence': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'receiptId',
                'copyVersion',
                'acceptedAt',
                'phoneVerifiedAt',
                'subjectUid',
                'senderHash',
              ],
              'properties': <String, Object?>{
                'receiptId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'copyVersion': <String, Object?>{
                  'type': 'string',
                  'const': 'catch-event-service-whatsapp-v1',
                },
                'acceptedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'phoneVerifiedAt': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'subjectUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'senderHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          ],
        },
        'expiresAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'updatedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'currentReceiptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sender': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'providerAccountId',
            'providerPhoneNumberId',
            'displayName',
            'displayPhoneNumber',
          ],
          'properties': <String, Object?>{
            'providerAccountId': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{5,40}\$',
            },
            'providerPhoneNumberId': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{5,40}\$',
            },
            'displayName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'displayPhoneNumber': <String, Object?>{
              'type': 'string',
              'minLength': 7,
              'maxLength': 32,
            },
          },
        },
        'recipientBinding': <String, Object?>{
          'type': 'object',
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'subjectUid',
                'sourceGeneration',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'rosterPhone',
                },
                'subjectUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceGeneration': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'subjectUid',
                'sourceGeneration',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'privateVerifiedPhone',
                },
                'subjectUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceGeneration': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          ],
        },
      },
    },
  ],
  'title': 'EventWhatsappPermissionDocument',
  'x-firestore-collection': 'eventAssistanceWhatsappPermissions',
  'x-firestore-path': 'eventAssistanceWhatsappPermissions/{permissionId}',
  'x-document-id-field': 'permissionId',
  'x-owner': 'verified participant event-service preferences',
};
