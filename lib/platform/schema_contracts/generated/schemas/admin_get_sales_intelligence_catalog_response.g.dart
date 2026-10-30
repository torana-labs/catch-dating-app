// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_intelligence_catalog_response.schema.json.

const schemaAdminGetSalesIntelligenceCatalogResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_intelligence_catalog_response.schema.json',
  'title': 'AdminGetSalesIntelligenceCatalogResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'policy',
    'assessments',
    'clauses',
    'evaluatedAt',
  ],
  'properties': <String, Object?>{
    'policy': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'SalesIntelligencePolicyDocument',
          'description': 'Private, owner-reviewed, versioned fit and priority policy. No production weights are checked into source.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesIntelligencePolicies',
          'x-firestore-path': 'salesIntelligencePolicies/{policyRecordId}',
          'x-document-id-field': 'policyRecordId',
          'x-owner': 'private Sales intelligence policy callable',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'policyRecordId',
            'policyId',
            'revision',
            'version',
            'status',
            'factors',
            'priorityBands',
            'promptVersion',
            'playbookVersion',
            'updatedAt',
            'updatedBy',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'policyRecordId': <String, Object?>{
              'const': 'current',
            },
            'policyId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'version': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'active',
                'paused',
              ],
            },
            'factors': <String, Object?>{
              'type': 'array',
              'minItems': 7,
              'maxItems': 7,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'id',
                  'weight',
                  'claimKeys',
                  'maxAgeDays',
                ],
                'properties': <String, Object?>{
                  'id': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 96,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'weight': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 100,
                  },
                  'claimKeys': <String, Object?>{
                    'type': 'array',
                    'minItems': 1,
                    'maxItems': 5,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'enum': <Object?>[
                        'identity',
                        'recurrence',
                        'operation',
                        'stack',
                        'other',
                      ],
                    },
                  },
                  'maxAgeDays': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 365,
                  },
                },
              },
            },
            'priorityBands': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'high',
                'medium',
              ],
              'properties': <String, Object?>{
                'high': <String, Object?>{
                  'type': 'number',
                  'minimum': 0,
                  'maximum': 100,
                },
                'medium': <String, Object?>{
                  'type': 'number',
                  'minimum': 0,
                  'maximum': 100,
                },
              },
            },
            'promptVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'playbookVersion': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'updatedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'updatedBy': <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'assessments': <String, Object?>{
      'type': 'array',
      'maxItems': 7,
      'items': <String, Object?>{
        'title': 'SalesIntelligenceAssessmentDocument',
        'description': 'Employee-reviewed factor rating linked to existing reviewed Sales evidence; unknown and disputed ratings cannot score.',
        'type': 'object',
        'additionalProperties': false,
        'x-firestore-collection': 'salesIntelligenceAssessments',
        'x-firestore-path': 'salesIntelligenceAssessments/{assessmentId}',
        'x-document-id-field': 'assessmentId',
        'x-owner': 'private Sales intelligence assessment callable',
        'required': <Object?>[
          'schemaVersion',
          'classification',
          'assessmentId',
          'organizerId',
          'factorId',
          'revision',
          'state',
          'value',
          'evidenceIds',
          'reason',
          'reviewedAt',
          'reviewerUid',
        ],
        'properties': <String, Object?>{
          'schemaVersion': <String, Object?>{
            'const': 1,
          },
          'classification': <String, Object?>{
            'const': 'sales_private',
          },
          'assessmentId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'factorId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'state': <String, Object?>{
            'enum': <Object?>[
              'known',
              'unknown',
              'disputed',
            ],
          },
          'value': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 5,
          },
          'evidenceIds': <String, Object?>{
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
          'reason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'reviewedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'reviewerUid': <String, Object?>{
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
    },
    'clauses': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'schemaVersion',
          'classification',
          'clauseId',
          'organizerId',
          'revision',
          'kind',
          'text',
          'state',
          'evidenceIds',
          'validUntil',
          'permission',
          'reviewedAt',
          'reviewedBy',
          'updatedAt',
          'updatedBy',
        ],
        'properties': <String, Object?>{
          'schemaVersion': <String, Object?>{
            'const': 1,
          },
          'classification': <String, Object?>{
            'const': 'sales_private',
          },
          'clauseId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'observation',
              'capability',
              'reference',
              'cta',
            ],
          },
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'state': <String, Object?>{
            'enum': <Object?>[
              'draft',
              'approved',
              'withdrawn',
            ],
          },
          'evidenceIds': <String, Object?>{
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
          'validUntil': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'permission': <String, Object?>{
            'enum': <Object?>[
              'not_required',
              'private_mention',
              'withdrawn',
            ],
          },
          'reviewedAt': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
          'reviewedBy': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 96,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'updatedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'updatedBy': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'partnerCitations': <String, Object?>{
            'type': 'array',
            'maxItems': 8,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceHash',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          },
          'partnerCitationOptions': <String, Object?>{
            'type': 'array',
            'maxItems': 8,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'observedAt',
                'validThrough',
                'excerpt',
                'confidence',
                'sourceHash',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 320,
                  'format': 'uri',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
                'validThrough': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'excerpt': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 500,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'confidence': <String, Object?>{
                  'enum': <Object?>[
                    'high',
                    'medium',
                    'low',
                  ],
                },
                'sourceHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
          },
        },
      },
    },
    'evaluatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-callable-aliases': <Object?>[
    'adminGetSalesIntelligenceCatalog',
  ],
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'catalogClause': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'clauseId',
        'organizerId',
        'revision',
        'kind',
        'text',
        'state',
        'evidenceIds',
        'validUntil',
        'permission',
        'reviewedAt',
        'reviewedBy',
        'updatedAt',
        'updatedBy',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'clauseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'kind': <String, Object?>{
          'enum': <Object?>[
            'observation',
            'capability',
            'reference',
            'cta',
          ],
        },
        'text': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'state': <String, Object?>{
          'enum': <Object?>[
            'draft',
            'approved',
            'withdrawn',
          ],
        },
        'evidenceIds': <String, Object?>{
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
        'validUntil': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'permission': <String, Object?>{
          'enum': <Object?>[
            'not_required',
            'private_mention',
            'withdrawn',
          ],
        },
        'reviewedAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'date-time',
        },
        'reviewedBy': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'updatedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'partnerCitations': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'evidenceId',
              'sourceHash',
            ],
            'properties': <String, Object?>{
              'evidenceId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 96,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
            },
          },
        },
        'partnerCitationOptions': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'evidenceId',
              'sourceRef',
              'observedAt',
              'validThrough',
              'excerpt',
              'confidence',
              'sourceHash',
            ],
            'properties': <String, Object?>{
              'evidenceId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 96,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'sourceRef': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 320,
                'format': 'uri',
              },
              'observedAt': <String, Object?>{
                'type': 'string',
                'format': 'date-time',
                'maxLength': 48,
              },
              'validThrough': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'format': 'date-time',
                    'maxLength': 48,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'excerpt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 500,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'confidence': <String, Object?>{
                'enum': <Object?>[
                  'high',
                  'medium',
                  'low',
                ],
              },
              'sourceHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
            },
          },
        },
      },
    },
  },
  'description': 'Private current catalog projects reviewed clause records with bounded, transient safe-public citation options; options are not persisted sharing grants.',
};
