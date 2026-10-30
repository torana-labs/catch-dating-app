// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/repair_event_assistance_delivery_payload.schema.json.

const schemaRepairEventAssistanceDeliveryCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'command',
    'expectedMessageRevision',
    'expectedReviewHash',
  ],
  'properties': <String, Object?>{
    'command': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'context',
        'eventId',
        'operationId',
        'payload',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'repairDelivery',
        },
        'context': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'eventId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'live',
                },
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'rehearsalId',
                'virtualEventId',
                'clockId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'rehearsal',
                },
                'rehearsalId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'virtualEventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'clockId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
          ],
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'operationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'payload': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'deliveryId',
            'action',
          ],
          'properties': <String, Object?>{
            'deliveryId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'action': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'reconcile',
                'retryDefiniteFailure',
                'manualHandoff',
              ],
            },
          },
        },
      },
    },
    'expectedMessageRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expectedReviewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'command': <String, Object?>{
          'properties': <String, Object?>{
            'context': <String, Object?>{
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'live',
                },
              },
            },
            'payload': <String, Object?>{
              'properties': <String, Object?>{
                'deliveryId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^outbox:[a-f0-9]{64}\$',
                },
              },
            },
          },
        },
      },
    },
  ],
  'title': 'RepairEventAssistanceDeliveryCallablePayload',
};
