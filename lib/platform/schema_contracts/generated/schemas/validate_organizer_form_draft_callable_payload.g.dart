// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/validate_organizer_form_draft_payload.schema.json.

const schemaValidateOrganizerFormDraftCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/validate_organizer_form_draft_payload.schema.json',
  'title': 'ValidateOrganizerFormDraftCallablePayload',
  'description': 'Validates an unsaved organizer form definition using the publish validator.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'definition',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
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
    'definition': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'title',
        'description',
        'purpose',
        'defaultTargetKind',
        'defaultTargetId',
        'identityPolicy',
        'sections',
        'logicRules',
        'appearance',
        'availability',
        'consent',
        'completion',
      ],
      'properties': <String, Object?>{
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'description': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'application',
            'registration',
            'intake',
            'waiver',
            'feedback',
            'survey',
          ],
        },
        'defaultTargetKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'campaign',
          ],
        },
        'defaultTargetId': <String, Object?>{
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
        'identityPolicy': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'anonymous',
            'emailVerified',
            'phoneVerified',
            'emailOrPhoneVerified',
            'catchAccount',
          ],
        },
        'sections': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'sectionId',
              'title',
              'description',
              'pageBreak',
              'questions',
            ],
            'properties': <String, Object?>{
              'sectionId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'description': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 1000,
              },
              'pageBreak': <String, Object?>{
                'type': 'boolean',
              },
              'questions': <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'questionId',
                    'key',
                    'label',
                    'helpText',
                    'kind',
                    'required',
                    'options',
                    'canonicalFieldId',
                    'privacyClass',
                    'prefillPolicy',
                    'hostPresentation',
                    'validation',
                  ],
                  'properties': <String, Object?>{
                    'questionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'key': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[A-Za-z][A-Za-z0-9_]{0,79}\$',
                    },
                    'label': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 240,
                    },
                    'helpText': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 500,
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
                    'required': <String, Object?>{
                      'type': 'boolean',
                    },
                    'options': <String, Object?>{
                      'type': 'array',
                      'maxItems': 100,
                      'items': <String, Object?>{
                        'type': 'object',
                        'additionalProperties': false,
                        'required': <Object?>[
                          'optionId',
                          'label',
                          'value',
                        ],
                        'properties': <String, Object?>{
                          'optionId': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          'label': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                          },
                          'value': <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 160,
                          },
                        },
                      },
                    },
                    'canonicalFieldId': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'x-catch-catalog': '../catalogs/person_fields.json',
                          'enum': <Object?>[
                            'givenName',
                            'familyName',
                            'displayName',
                            'dateOfBirth',
                            'age',
                            'gender',
                            'phoneNumber',
                            'email',
                            'instagramHandle',
                            'linkedinUrl',
                            'profilePhoto',
                            'city',
                            'heightCm',
                            'occupation',
                            'company',
                            'education',
                            'languages',
                            'relationshipGoal',
                            'interestedInGenders',
                            'drinking',
                            'smoking',
                            'religion',
                            'workout',
                            'diet',
                            'children',
                          ],
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
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
                    'answerDestination': <String, Object?>{
                      'description': 'Omitted legacy values mean organizerOnly. A canonical mapping never grants profile sharing permission. Catch profile and organizer card answers remain private until participant claim and explicit sharing.',
                      'type': 'string',
                      'enum': <Object?>[
                        'organizerOnly',
                        'catchProfile',
                        'organizerCard',
                      ],
                    },
                    'answerAudience': <String, Object?>{
                      'description': 'Optional published audience intent. Omission on older versions means organizerOnly; selection and event-specific consent are still required before any attendee projection.',
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'mode',
                        'eventProfileSlot',
                      ],
                      'properties': <String, Object?>{
                        'mode': <String, Object?>{
                          'type': 'string',
                          'enum': <Object?>[
                            'organizerOnly',
                            'eventMembersWithConsent',
                          ],
                        },
                        'eventProfileSlot': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'enum': <Object?>[
                            null,
                            'customRow',
                          ],
                        },
                      },
                    },
                    'prefillPolicy': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'never',
                        'participantReviewRequired',
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
                    'validation': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'minLength',
                        'maxLength',
                        'minNumber',
                        'maxNumber',
                        'earliestDate',
                        'latestDate',
                        'minSelections',
                        'maxSelections',
                        'maxFileCount',
                        'maxFileSizeBytes',
                        'allowedMimeTypes',
                        'patternPreset',
                        'customError',
                      ],
                      'properties': <String, Object?>{
                        'minLength': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 0,
                          'maximum': 4000,
                        },
                        'maxLength': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 4000,
                        },
                        'minNumber': <String, Object?>{
                          'type': <Object?>[
                            'number',
                            'null',
                          ],
                          'minimum': -1000000000,
                          'maximum': 1000000000,
                        },
                        'maxNumber': <String, Object?>{
                          'type': <Object?>[
                            'number',
                            'null',
                          ],
                          'minimum': -1000000000,
                          'maximum': 1000000000,
                        },
                        'earliestDate': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'format': 'date',
                        },
                        'latestDate': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'format': 'date',
                        },
                        'minSelections': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 0,
                          'maximum': 100,
                        },
                        'maxSelections': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 100,
                        },
                        'maxFileCount': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 10,
                        },
                        'maxFileSizeBytes': <String, Object?>{
                          'type': <Object?>[
                            'integer',
                            'null',
                          ],
                          'minimum': 1,
                          'maximum': 26214400,
                        },
                        'allowedMimeTypes': <String, Object?>{
                          'type': 'array',
                          'maxItems': 20,
                          'uniqueItems': true,
                          'items': <String, Object?>{
                            'type': 'string',
                            'pattern': '^[a-z0-9.+-]+/[a-z0-9.+*-]+\$',
                            'maxLength': 100,
                          },
                        },
                        'patternPreset': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'enum': <Object?>[
                            null,
                            'lettersAndSpaces',
                            'alphanumeric',
                            'postalCode',
                            'handle',
                          ],
                        },
                        'customError': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 240,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'logicRules': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'ruleId',
              'conditionMode',
              'conditions',
              'action',
              'targetQuestionId',
              'targetSectionId',
            ],
            'properties': <String, Object?>{
              'ruleId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'conditionMode': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'all',
                  'any',
                ],
              },
              'conditions': <String, Object?>{
                'type': 'array',
                'minItems': 1,
                'maxItems': 20,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'questionId',
                    'operator',
                    'expectedValues',
                  ],
                  'properties': <String, Object?>{
                    'questionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'operator': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'equals',
                        'notEquals',
                        'contains',
                        'notContains',
                        'greaterThan',
                        'lessThan',
                        'answered',
                        'notAnswered',
                      ],
                    },
                    'expectedValues': <String, Object?>{
                      'type': 'array',
                      'maxItems': 20,
                      'items': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'number',
                          'boolean',
                        ],
                      },
                    },
                  },
                },
              },
              'action': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'showQuestion',
                  'hideQuestion',
                  'showSection',
                  'hideSection',
                  'routeToSection',
                  'finish',
                ],
              },
              'targetQuestionId': <String, Object?>{
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
              'targetSectionId': <String, Object?>{
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
            },
          },
        },
        'appearance': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'preset',
            'logoAssetId',
            'coverAssetId',
            'activityKind',
          ],
          'properties': <String, Object?>{
            'preset': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'editorial',
                'minimal',
                'activity',
              ],
            },
            'logoAssetId': <String, Object?>{
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
            'coverAssetId': <String, Object?>{
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
            'activityKind': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
            },
          },
        },
        'availability': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'opensAt',
            'closesAt',
            'responseLimit',
            'closedMessage',
          ],
          'properties': <String, Object?>{
            'opensAt': <String, Object?>{
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
            'closesAt': <String, Object?>{
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
            'responseLimit': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 1,
              'maximum': 1000000,
            },
            'closedMessage': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 500,
            },
          },
        },
        'consent': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'consentCopy',
            'consentVersion',
            'retentionCopy',
          ],
          'properties': <String, Object?>{
            'consentCopy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'consentVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'retentionCopy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
          },
        },
        'payment': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'description': 'An optional fee for form submission, separate from event purchases and admission. Null or omitted means free.',
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'connectionId',
                'amountPaise',
                'currency',
                'description',
                'refundPolicy',
              ],
              'properties': <String, Object?>{
                'connectionId': <String, Object?>{
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
                'amountPaise': <String, Object?>{
                  'type': 'integer',
                  'minimum': 100,
                  'maximum': 10000000,
                },
                'currency': <String, Object?>{
                  'const': 'INR',
                },
                'description': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'refundPolicy': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 1000,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'messagingConsent': <String, Object?>{
          'description': 'Controls which separate, optional, initially unchecked WhatsApp choices are offered. These settings are never respondent consent.',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerWhatsapp',
            'catchWhatsapp',
          ],
          'properties': <String, Object?>{
            'organizerWhatsapp': <String, Object?>{
              'type': 'boolean',
            },
            'catchWhatsapp': <String, Object?>{
              'type': 'boolean',
            },
            'organizerOperationsWhatsapp': <String, Object?>{
              'type': 'boolean',
            },
            'organizerMarketingWhatsapp': <String, Object?>{
              'type': 'boolean',
            },
            'catchMarketingWhatsapp': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
        'eventProfile': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'enabled',
            'allowedSlots',
            'maxCustomRows',
            'noticeVersion',
          ],
          'properties': <String, Object?>{
            'enabled': <String, Object?>{
              'type': 'boolean',
            },
            'allowedSlots': <String, Object?>{
              'type': 'array',
              'uniqueItems': true,
              'maxItems': 4,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'displayName',
                  'portrait',
                  'introduction',
                  'customRow',
                ],
              },
            },
            'maxCustomRows': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 20,
            },
            'noticeVersion': <String, Object?>{
              'type': 'string',
              'const': 'event-profile-sharing-v2',
            },
          },
        },
        'completion': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'title',
            'message',
            'actionKind',
            'actionLabel',
            'actionUrl',
          ],
          'properties': <String, Object?>{
            'title': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'message': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 1000,
            },
            'actionKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'none',
                'externalUrl',
                'event',
                'eventRuntime',
              ],
            },
            'actionLabel': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 80,
            },
            'actionUrl': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'uri',
              'maxLength': 500,
            },
          },
        },
      },
    },
  },
};
