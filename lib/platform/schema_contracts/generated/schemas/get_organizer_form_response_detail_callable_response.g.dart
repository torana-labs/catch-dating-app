// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_form_response_detail_response.schema.json.

const schemaGetOrganizerFormResponseDetailCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_form_response_detail_response.schema.json',
  'title': 'GetOrganizerFormResponseDetailCallableResponse',
  'description': 'One immutable response with classified answers and expiring asset downloads.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'response',
    'answers',
    'consentVersion',
    'completionMillis',
  ],
  'properties': <String, Object?>{
    'response': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'responseId',
        'formId',
        'formTitle',
        'versionId',
        'version',
        'status',
        'identityKind',
        'identity',
        'sourceLinkId',
        'sourceLabel',
        'submittedAtMillis',
        'withdrawnAtMillis',
        'highlights',
        'conversionKinds',
      ],
      'properties': <String, Object?>{
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formTitle': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'versionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'version': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'submitted',
            'withdrawn',
          ],
        },
        'identityKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'anonymous',
            'emailVerified',
            'phoneVerified',
            'catchAccount',
          ],
        },
        'identity': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'displayName',
            'email',
            'phoneE164',
            'searchName',
            'origin',
          ],
          'properties': <String, Object?>{
            'displayName': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'email': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'email',
              'maxLength': 320,
            },
            'phoneE164': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'pattern': '^\\+[1-9][0-9]{7,14}\$',
            },
            'searchName': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'origin': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'anonymous',
                'respondentGranted',
                'organizerAcquired',
              ],
            },
          },
        },
        'sourceLinkId': <String, Object?>{
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
        },
        'sourceLabel': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'submittedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'withdrawnAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'highlights': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'questionId',
              'label',
              'answer',
            ],
            'properties': <String, Object?>{
              'questionId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'answer': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'maxLength': 10000,
                  },
                  <String, Object?>{
                    'type': 'number',
                    'minimum': -1000000000,
                    'maximum': 1000000000,
                  },
                  <String, Object?>{
                    'type': 'boolean',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                  <String, Object?>{
                    'type': 'array',
                    'maxItems': 100,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'maxLength': 500,
                    },
                  },
                ],
              },
            },
          },
        },
        'conversionKinds': <String, Object?>{
          'type': 'array',
          'maxItems': 4,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'crmContact',
              'application',
              'eventAttendeeProposal',
              'followUp',
            ],
          },
        },
      },
    },
    'answers': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'key',
          'label',
          'kind',
          'privacyClass',
          'hostPresentation',
          'answer',
          'origin',
          'assetDownloads',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'key': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'shortText',
              'longText',
              'singleChoice',
              'multiChoice',
              'date',
              'phone',
              'email',
              'url',
              'number',
              'boolean',
              'file',
              'acknowledgement',
              'signature',
            ],
          },
          'privacyClass': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'contact',
              'profile',
              'sensitive',
              'organizerCustom',
            ],
          },
          'hostPresentation': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'detailOnly',
              'filterable',
              'sortable',
            ],
          },
          'answer': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'maxLength': 10000,
              },
              <String, Object?>{
                'type': 'number',
                'minimum': -1000000000,
                'maximum': 1000000000,
              },
              <String, Object?>{
                'type': 'boolean',
              },
              <String, Object?>{
                'type': 'null',
              },
              <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 500,
                },
              },
            ],
          },
          'origin': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'anonymous',
              'respondentGranted',
              'organizerAcquired',
              'revoked',
            ],
          },
          'assetDownloads': <String, Object?>{
            'type': 'array',
            'maxItems': 10,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'assetId',
                'fileName',
                'contentType',
                'sizeBytes',
                'downloadUrl',
                'expiresAtMillis',
              ],
              'properties': <String, Object?>{
                'assetId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'fileName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 240,
                },
                'contentType': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 100,
                },
                'sizeBytes': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 26214400,
                },
                'downloadUrl': <String, Object?>{
                  'type': 'string',
                  'format': 'uri',
                  'maxLength': 4000,
                },
                'expiresAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
        },
      },
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'completionMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 604800000,
    },
    'applicationId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'payment': <String, Object?>{
      'description': 'Authorized financial record linked to this submitted response; no draft or credential data.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'paymentId',
            'status',
            'mode',
            'amountPaise',
            'currency',
            'refundedAmountPaise',
            'createdAtMillis',
            'updatedAtMillis',
            'capturedAtMillis',
            'submittedAtMillis',
            'responseId',
            'providerOrderId',
            'providerPaymentId',
            'providerRefundId',
            'receipt',
          ],
          'properties': <String, Object?>{
            'paymentId': <String, Object?>{
              'type': 'string',
              'pattern': '^fp_[a-f0-9]{32}\$',
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'creatingOrder',
                'orderUnknown',
                'checkoutReady',
                'verifying',
                'captured',
                'submitted',
                'failed',
                'expired',
                'refundPending',
                'refunded',
                'reviewRequired',
              ],
              'type': 'string',
            },
            'mode': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'test',
                'live',
              ],
            },
            'amountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 100,
              'maximum': 10000000,
            },
            'currency': <String, Object?>{
              'const': 'INR',
            },
            'refundedAmountPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 10000000,
            },
            'createdAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'updatedAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'capturedAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'submittedAtMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'responseId': <String, Object?>{
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
            },
            'providerOrderId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'providerPaymentId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'providerRefundId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'receipt': <String, Object?>{
              'type': 'string',
              'pattern': '^cfp_[a-f0-9]{32}\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
