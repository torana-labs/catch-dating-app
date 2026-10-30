// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_action_receipts.schema.json.

const schemaSalesActionReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_action_receipts.schema.json',
  'title': 'SalesActionReceiptDocument',
  'description': 'Actor- and scope-bound immutable idempotency receipt; result is bounded and never public.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesActionReceipts',
  'x-firestore-path': 'salesActionReceipts/{receiptId}',
  'x-owner': 'private Sales action dispatcher',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'requestId',
    'requestHash',
    'action',
    'actorUid',
    'clientId',
    'clientAuthUid',
    'delegationId',
    'organizerId',
    'createdAt',
    'result',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'hosts.create',
        'hosts.update',
        'tasks.upsert',
        'opportunities.upsert',
        'activities.log',
        'fields.create',
        'fields.setValue',
        'intents.link',
        'imports.apply',
        'contacts.upsert',
        'evidence.add',
        'accounts.setSuppression',
        'contacts.setContactability',
        'evidence.propose',
        'evidence.reviewProposal',
        'commercial.pilots.upsert',
        'commercial.quotes.revise',
        'commercial.quotes.approve',
        'commercial.quotes.accept',
        'commercial.finance.attest',
        'imports.compensation.apply',
        'imports.history.apply',
        'partner.register',
        'partner.nominate',
        'partner.assign',
        'partner.assignment.decide',
        'partner.revoke',
        'partner.assignment.update',
        'partner.demo.wording.propose',
        'partner.marketing.review',
        'partner.marketing.revoke',
      ],
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clientId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'clientAuthUid': <String, Object?>{
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
    'delegationId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'result': <String, Object?>{
      'type': 'object',
      'maxProperties': 8,
      'additionalProperties': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 0,
                        'maxLength': 2000,
                      },
                      <String, Object?>{
                        'type': 'number',
                      },
                      <String, Object?>{
                        'type': 'boolean',
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  <String, Object?>{
                    'type': 'array',
                    'maxItems': 25,
                    'items': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                  },
                  <String, Object?>{
                    'type': 'object',
                    'maxProperties': 40,
                    'additionalProperties': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                  },
                ],
              },
              <String, Object?>{
                'type': 'array',
                'maxItems': 25,
                'items': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    <String, Object?>{
                      'type': 'array',
                      'maxItems': 25,
                      'items': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'maxProperties': 40,
                      'additionalProperties': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              <String, Object?>{
                'type': 'object',
                'maxProperties': 40,
                'additionalProperties': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    <String, Object?>{
                      'type': 'array',
                      'maxItems': 25,
                      'items': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'maxProperties': 40,
                      'additionalProperties': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
          <String, Object?>{
            'type': 'array',
            'maxItems': 25,
            'items': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    <String, Object?>{
                      'type': 'array',
                      'maxItems': 25,
                      'items': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'maxProperties': 40,
                      'additionalProperties': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  ],
                },
                <String, Object?>{
                  'type': 'array',
                  'maxItems': 25,
                  'items': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 25,
                        'items': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'maxProperties': 40,
                        'additionalProperties': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'maxProperties': 40,
                  'additionalProperties': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 25,
                        'items': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'maxProperties': 40,
                        'additionalProperties': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          <String, Object?>{
            'type': 'object',
            'maxProperties': 40,
            'additionalProperties': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 0,
                          'maxLength': 2000,
                        },
                        <String, Object?>{
                          'type': 'number',
                        },
                        <String, Object?>{
                          'type': 'boolean',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    <String, Object?>{
                      'type': 'array',
                      'maxItems': 25,
                      'items': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'maxProperties': 40,
                      'additionalProperties': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  ],
                },
                <String, Object?>{
                  'type': 'array',
                  'maxItems': 25,
                  'items': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 25,
                        'items': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'maxProperties': 40,
                        'additionalProperties': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'maxProperties': 40,
                  'additionalProperties': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 0,
                            'maxLength': 2000,
                          },
                          <String, Object?>{
                            'type': 'number',
                          },
                          <String, Object?>{
                            'type': 'boolean',
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 25,
                        'items': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                      <String, Object?>{
                        'type': 'object',
                        'maxProperties': 40,
                        'additionalProperties': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'minLength': 0,
                              'maxLength': 2000,
                            },
                            <String, Object?>{
                              'type': 'number',
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'partner.demo.wording.propose',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'result': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'organizerId',
              'blueprintId',
              'proposalRevision',
              'sourcePreviewHash',
              'state',
              'sendAuthority',
              'capabilityApprovalAuthority',
              'organizerControlAuthority',
            ],
            'properties': <String, Object?>{
              'organizerId': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Za-z0-9_-]{3,128}\$',
              },
              'blueprintId': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Za-z0-9_-]{3,128}\$',
              },
              'proposalRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
              },
              'sourcePreviewHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'state': <String, Object?>{
                'const': 'pending_owner_review',
              },
              'sendAuthority': <String, Object?>{
                'const': false,
              },
              'capabilityApprovalAuthority': <String, Object?>{
                'const': false,
              },
              'organizerControlAuthority': <String, Object?>{
                'const': false,
              },
            },
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'result': <String, Object?>{
            'maxProperties': 7,
          },
        },
      },
    },
  ],
};
