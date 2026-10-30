// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_outreach_jobs.schema.json.

const schemaSalesOutreachJobsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_outreach_jobs.schema.json',
  'title': 'SalesOutreachJobDocument',
  'description': 'Private frozen zero-model draft request, attempt lease and completion pointer. Firestore is authoritative; local Operations files are temporary scratch only.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesOutreachJobs',
  'x-firestore-path': 'salesOutreachJobs/{jobId}',
  'x-document-id-field': 'jobId',
  'x-owner': 'private Sales intelligence generate callable',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'jobId',
    'actorUid',
    'requestId',
    'materialHash',
    'sourceHash',
    'sourceRequest',
    'frozenBundle',
    'status',
    'attemptCount',
    'leaseOwner',
    'leaseUntil',
    'expiresAt',
    'createdAt',
    'updatedAt',
    'result',
    'failure',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'jobId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'materialHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceRequest': <String, Object?>{
      'title': 'AdminBuildSalesOutreachInputPayload',
      'description': 'Selects only existing approved clause IDs; trusted server builds the Operations snapshot. No source prose is accepted from the caller.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'contactId',
        'opportunityId',
        'observationIds',
        'capabilityIds',
        'referenceIds',
        'ctaIds',
        'channel',
        'purpose',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'observationIds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 12,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'capabilityIds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 12,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'referenceIds': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'ctaIds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'channel': <String, Object?>{
          'enum': <Object?>[
            'email',
            'message',
          ],
        },
        'purpose': <String, Object?>{
          'enum': <Object?>[
            'first_message',
            'follow_up',
          ],
        },
        'priorActivityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'definitions': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'frozenBundle': <String, Object?>{
      'title': 'OutreachDraftingInput',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'organizer',
        'contact',
        'opportunity',
        'language',
        'channel',
        'purpose',
        'evaluatedAt',
        'policy',
        'observations',
        'capabilities',
        'references',
        'ctas',
        'priorInteraction',
        'evidenceConflictStatus',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'organizer': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerId',
            'name',
            'revision',
            'identityStatus',
          ],
          'properties': <String, Object?>{
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'identityStatus': <String, Object?>{
              'const': 'verified',
            },
          },
        },
        'contact': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'contactId',
            'revision',
            'role',
            'eligibility',
            'suppressionStatus',
            'claimStatus',
          ],
          'properties': <String, Object?>{
            'contactId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'role': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'eligibility': <String, Object?>{
              'const': 'eligible',
            },
            'suppressionStatus': <String, Object?>{
              'const': 'clear',
            },
            'claimStatus': <String, Object?>{
              'enum': <Object?>[
                'verified',
                'not_required',
              ],
            },
          },
        },
        'opportunity': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'opportunityId',
            'revision',
            'stage',
            'motion',
          ],
          'properties': <String, Object?>{
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'stage': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'motion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        'language': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'en',
          ],
        },
        'channel': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'email',
            'message',
          ],
        },
        'purpose': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'first_message',
            'follow_up',
          ],
        },
        'evaluatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'policy': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'promptVersion',
            'playbookVersion',
            'modelId',
          ],
          'properties': <String, Object?>{
            'promptVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'playbookVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'modelId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        'observations': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'text',
              'revision',
              'organizerId',
              'approved',
              'validUntil',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'approved': <String, Object?>{
                'const': true,
              },
              'validUntil': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
            },
          },
        },
        'capabilities': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'text',
              'revision',
              'organizerId',
              'approved',
              'validUntil',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'approved': <String, Object?>{
                'const': true,
              },
              'validUntil': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
            },
          },
        },
        'references': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'text',
              'revision',
              'organizerId',
              'approved',
              'validUntil',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'approved': <String, Object?>{
                'const': true,
              },
              'validUntil': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
              },
            },
          },
        },
        'ctas': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'text',
              'revision',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'text': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 500,
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
        'priorInteraction': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'activityId',
                'summary',
                'revision',
              ],
              'properties': <String, Object?>{
                'activityId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'summary': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
          ],
        },
        'evidenceConflictStatus': <String, Object?>{
          'enum': <Object?>[
            'clear',
            'needs_review',
          ],
        },
      },
      'definitions': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'text': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'organizer': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'organizerId',
            'name',
            'revision',
            'identityStatus',
          ],
          'properties': <String, Object?>{
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'identityStatus': <String, Object?>{
              'const': 'verified',
            },
          },
        },
        'contact': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'contactId',
            'revision',
            'role',
            'eligibility',
            'suppressionStatus',
            'claimStatus',
          ],
          'properties': <String, Object?>{
            'contactId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'role': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'eligibility': <String, Object?>{
              'const': 'eligible',
            },
            'suppressionStatus': <String, Object?>{
              'const': 'clear',
            },
            'claimStatus': <String, Object?>{
              'enum': <Object?>[
                'verified',
                'not_required',
              ],
            },
          },
        },
        'opportunity': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'opportunityId',
            'revision',
            'stage',
            'motion',
          ],
          'properties': <String, Object?>{
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'stage': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'motion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        'clause': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'id',
            'text',
            'revision',
            'organizerId',
            'approved',
            'validUntil',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'text': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'approved': <String, Object?>{
              'const': true,
            },
            'validUntil': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
          },
        },
      },
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'running',
        'completed',
        'failed',
      ],
    },
    'attemptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 3,
    },
    'leaseOwner': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 64,
    },
    'leaseUntil': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'result': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'draftId',
        'contentHash',
      ],
      'properties': <String, Object?>{
        'draftId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'contentHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    'failure': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 160,
    },
    'participantScope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'partnerUid',
        'assignmentRevision',
      ],
      'properties': <String, Object?>{
        'partnerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'assignmentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'hash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
};
