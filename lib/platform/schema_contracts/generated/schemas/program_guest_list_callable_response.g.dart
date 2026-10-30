// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_guest_list_response.schema.json.

const schemaProgramGuestListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_guest_list_response.schema.json',
  'title': 'ProgramGuestListCallableResponse',
  'description': 'Program-authorized guest inventory. Name and endpoints resolve only from selected same-program field acquisition evidence; private organizer-wide contact fields are never dereferenced.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'guests',
    'households',
    'functionGuests',
    'groups',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'guests': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'displayName',
          'householdId',
          'contactId',
          'phoneE164',
          'email',
          'externalReference',
          'groupIds',
          'invitationStatus',
          'rsvpStatus',
          'revision',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'householdId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'contactId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
            'description': 'Optional link to organizerContacts. Lets program-scoped surfaces (the host inbox scope chip) attribute contact-linked threads to this program\'s guests.',
          },
          'phoneE164': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 20,
          },
          'email': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 320,
          },
          'externalReference': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'groupIds': <String, Object?>{
            'type': 'array',
            'maxItems': 20,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'programGuestGroups ids this guest belongs to. Resolve labels via the groups array on this response.',
          },
          'invitationStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'notInvited',
              'invited',
              'delivered',
              'responded',
            ],
          },
          'rsvpStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'attending',
              'declined',
              'maybe',
            ],
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'fieldAuthority': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'displayName',
              'phoneE164',
              'email',
            ],
            'properties': <String, Object?>{
              'displayName': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'state',
                  'assertionId',
                  'sourceKind',
                  'alternativeAssertionIds',
                  'alternatives',
                ],
                'properties': <String, Object?>{
                  'state': <String, Object?>{
                    'enum': <Object?>[
                      'available',
                      'cleared',
                      'unknown',
                      'restricted',
                    ],
                  },
                  'assertionId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'pattern': '^wfa_[a-f0-9]{64}\$',
                  },
                  'sourceKind': <String, Object?>{
                    'enum': <Object?>[
                      'manualEntry',
                      'manifestRow',
                      null,
                    ],
                  },
                  'alternativeAssertionIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'string',
                      'pattern': '^wfa_[a-f0-9]{64}\$',
                    },
                  },
                  'alternatives': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'assertionId',
                        'value',
                        'sourceKind',
                        'sourceId',
                        'sourceVersion',
                        'observedAtMillis',
                      ],
                      'properties': <String, Object?>{
                        'assertionId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^wfa_[a-f0-9]{64}\$',
                        },
                        'value': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 320,
                        },
                        'sourceKind': <String, Object?>{
                          'enum': <Object?>[
                            'manualEntry',
                            'manifestRow',
                          ],
                        },
                        'sourceId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'sourceVersion': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'observedAtMillis': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                      },
                    },
                  },
                },
              },
              'phoneE164': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'state',
                  'assertionId',
                  'sourceKind',
                  'alternativeAssertionIds',
                  'alternatives',
                ],
                'properties': <String, Object?>{
                  'state': <String, Object?>{
                    'enum': <Object?>[
                      'available',
                      'cleared',
                      'unknown',
                      'restricted',
                    ],
                  },
                  'assertionId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'pattern': '^wfa_[a-f0-9]{64}\$',
                  },
                  'sourceKind': <String, Object?>{
                    'enum': <Object?>[
                      'manualEntry',
                      'manifestRow',
                      null,
                    ],
                  },
                  'alternativeAssertionIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'string',
                      'pattern': '^wfa_[a-f0-9]{64}\$',
                    },
                  },
                  'alternatives': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'assertionId',
                        'value',
                        'sourceKind',
                        'sourceId',
                        'sourceVersion',
                        'observedAtMillis',
                      ],
                      'properties': <String, Object?>{
                        'assertionId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^wfa_[a-f0-9]{64}\$',
                        },
                        'value': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 320,
                        },
                        'sourceKind': <String, Object?>{
                          'enum': <Object?>[
                            'manualEntry',
                            'manifestRow',
                          ],
                        },
                        'sourceId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'sourceVersion': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'observedAtMillis': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                      },
                    },
                  },
                },
              },
              'email': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'state',
                  'assertionId',
                  'sourceKind',
                  'alternativeAssertionIds',
                  'alternatives',
                ],
                'properties': <String, Object?>{
                  'state': <String, Object?>{
                    'enum': <Object?>[
                      'available',
                      'cleared',
                      'unknown',
                      'restricted',
                    ],
                  },
                  'assertionId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'pattern': '^wfa_[a-f0-9]{64}\$',
                  },
                  'sourceKind': <String, Object?>{
                    'enum': <Object?>[
                      'manualEntry',
                      'manifestRow',
                      null,
                    ],
                  },
                  'alternativeAssertionIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'string',
                      'pattern': '^wfa_[a-f0-9]{64}\$',
                    },
                  },
                  'alternatives': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'assertionId',
                        'value',
                        'sourceKind',
                        'sourceId',
                        'sourceVersion',
                        'observedAtMillis',
                      ],
                      'properties': <String, Object?>{
                        'assertionId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^wfa_[a-f0-9]{64}\$',
                        },
                        'value': <String, Object?>{
                          'type': <Object?>[
                            'string',
                            'null',
                          ],
                          'maxLength': 320,
                        },
                        'sourceKind': <String, Object?>{
                          'enum': <Object?>[
                            'manualEntry',
                            'manifestRow',
                          ],
                        },
                        'sourceId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'sourceVersion': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                        'observedAtMillis': <String, Object?>{
                          'type': 'integer',
                          'minimum': 1,
                          'maximum': 9007199254740991,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'households': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'householdId',
          'label',
          'memberGuestIds',
          'revision',
        ],
        'properties': <String, Object?>{
          'householdId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'memberGuestIds': <String, Object?>{
            'type': 'array',
            'maxItems': 50,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
      },
    },
    'functionGuests': <String, Object?>{
      'type': 'array',
      'maxItems': 4000,
      'description': 'Per-function invitation/RSVP/attendance join rows covering the paged guests. Rows exist only where a programFunctionGuests document was written; an allGuests function with no row reads as implicitly invited and pending.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'functionId',
          'invited',
          'rsvpStatus',
          'attendanceStatus',
          'partySize',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'functionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'invited': <String, Object?>{
            'type': 'boolean',
          },
          'rsvpStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'attending',
              'declined',
              'maybe',
            ],
          },
          'attendanceStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'expected',
              'checkedIn',
              'noShow',
            ],
            'description': 'Door/arrival state for one guest at one function. expected is the default for invited guests; noShow is marked after the function ends.',
          },
          'partySize': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 20,
          },
        },
      },
    },
    'groups': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'description': 'programGuestGroups documents referenced by groupIds on the paged guests. Page-scoped like households; a group referenced but absent here is corrupt and surfaces as a reconciliation error.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'groupId',
          'label',
          'dimension',
          'sortOrder',
          'memberCount',
          'revision',
        ],
        'properties': <String, Object?>{
          'groupId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'dimension': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'sortOrder': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 10000,
          },
          'memberCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
  },
};
