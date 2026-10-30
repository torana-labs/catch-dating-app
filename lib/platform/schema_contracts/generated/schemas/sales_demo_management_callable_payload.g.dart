// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/sales_demo_management.schema.json.

const schemaSalesDemoManagementCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/sales_demo_management.schema.json',
  'title': 'SalesDemoManagementCallablePayloads',
  'description': 'Admin Owner demo commands and bounded owner reads. A request ID is stable across retries; reads never return grant digests.',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'blueprintId',
        'expectedRevision',
        'evidenceRevision',
        'preview',
        'formCapabilityReview',
        'fieldMappings',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'organizerId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'candidateId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'opportunityId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'evidenceRevision': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'preview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'brandName',
            'headline',
            'scenario',
            'steps',
            'retainedTools',
            'limitations',
            'cta',
          ],
          'properties': <String, Object?>{
            'brandName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'headline': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'scenario': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'steps': <String, Object?>{
              'type': 'array',
              'minItems': 3,
              'maxItems': 3,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'retainedTools': <String, Object?>{
              'type': 'array',
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'limitations': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'cta': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
          },
        },
        'formCapabilityReview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'questionTypes',
            'branching',
            'requiredFields',
            'scoringApproval',
            'uploads',
          ],
          'properties': <String, Object?>{
            'questionTypes': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'branching': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'requiredFields': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'scoringApproval': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'uploads': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
          },
        },
        'fieldMappings': <String, Object?>{
          'type': 'array',
          'maxItems': 30,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'sourceField',
              'catchField',
              'disposition',
            ],
            'properties': <String, Object?>{
              'sourceField': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'catchField': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'disposition': <String, Object?>{
                'enum': <Object?>[
                  'exact',
                  'manual',
                  'retained',
                  'unsupported',
                ],
              },
            },
          },
        },
        'setupPlan': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'requirements',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'manual',
                },
                'requirements': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'minItems': 1,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'requirements',
                'templateId',
                'title',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'template',
                },
                'requirements': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                },
                'templateId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9_-]{3,128}\$',
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
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
        'requestId',
        'blueprintId',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'blueprintId',
        'blueprintRevision',
        'expiresAt',
        'sessionCap',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'blueprintRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'contactBinding': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'value',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'enum': <Object?>[
                    'email',
                    'phone',
                  ],
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'maxLength': 254,
                },
              },
            },
          ],
        },
        'expiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'sessionCap': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 3,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'invitationId',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'blueprintId',
      ],
      'properties': <String, Object?>{
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'invitationId',
      ],
      'properties': <String, Object?>{
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'maxProperties': 0,
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'cursor': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'limit': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 20,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'blueprintId',
      ],
      'properties': <String, Object?>{
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'cursor': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'limit': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 20,
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'save': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'blueprintId',
        'expectedRevision',
        'evidenceRevision',
        'preview',
        'formCapabilityReview',
        'fieldMappings',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'organizerId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'candidateId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'opportunityId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'evidenceRevision': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'preview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'brandName',
            'headline',
            'scenario',
            'steps',
            'retainedTools',
            'limitations',
            'cta',
          ],
          'properties': <String, Object?>{
            'brandName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'headline': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'scenario': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'steps': <String, Object?>{
              'type': 'array',
              'minItems': 3,
              'maxItems': 3,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'retainedTools': <String, Object?>{
              'type': 'array',
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'limitations': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'cta': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
          },
        },
        'formCapabilityReview': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'questionTypes',
            'branching',
            'requiredFields',
            'scoringApproval',
            'uploads',
          ],
          'properties': <String, Object?>{
            'questionTypes': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'branching': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'requiredFields': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'scoringApproval': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
            'uploads': <String, Object?>{
              'enum': <Object?>[
                'exact',
                'manual',
                'retained',
                'unsupported',
              ],
            },
          },
        },
        'fieldMappings': <String, Object?>{
          'type': 'array',
          'maxItems': 30,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'sourceField',
              'catchField',
              'disposition',
            ],
            'properties': <String, Object?>{
              'sourceField': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'catchField': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'disposition': <String, Object?>{
                'enum': <Object?>[
                  'exact',
                  'manual',
                  'retained',
                  'unsupported',
                ],
              },
            },
          },
        },
        'setupPlan': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'requirements',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'manual',
                },
                'requirements': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'minItems': 1,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'requirements',
                'templateId',
                'title',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'template',
                },
                'requirements': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                },
                'templateId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9_-]{3,128}\$',
                },
                'title': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
              },
            },
          ],
        },
      },
    },
    'blueprintDecision': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'blueprintId',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    'issue': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'blueprintId',
        'blueprintRevision',
        'expiresAt',
        'sessionCap',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'blueprintRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'contactBinding': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'value',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'enum': <Object?>[
                    'email',
                    'phone',
                  ],
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'maxLength': 254,
                },
              },
            },
          ],
        },
        'expiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'sessionCap': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 3,
        },
      },
    },
    'revoke': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'invitationId',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    'blueprintRead': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'blueprintId',
      ],
      'properties': <String, Object?>{
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
      },
    },
    'invitationRead': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'invitationId',
      ],
      'properties': <String, Object?>{
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
      },
    },
    'capabilityRead': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'maxProperties': 0,
    },
    'page': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 20,
    },
    'blueprintList': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'cursor': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'limit': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 20,
        },
      },
    },
    'invitationList': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'blueprintId',
      ],
      'properties': <String, Object?>{
        'blueprintId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'cursor': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'limit': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 20,
        },
      },
    },
  },
  'x-callables': <Object?>[
    'adminSaveSalesDemoBlueprint',
    'adminReviewSalesDemoBlueprint',
    'adminWithdrawSalesDemoBlueprint',
    'adminIssueSalesDemoInvitation',
    'adminRevokeSalesDemoInvitation',
    'adminGetSalesDemoBlueprint',
    'adminGetSalesDemoInvitation',
    'adminGetSalesDemoCapability',
    'adminListSalesDemoBlueprints',
    'adminListSalesDemoInvitations',
  ],
};
