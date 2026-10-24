/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const operationWorkItemSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/operations/work_item.schema.json",
  "title": "OperationWorkItem",
  "description": "One exclusively staged unit of work. Task flags are orthogonal and may overlap.",
  "type": "object",
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "organizer_listing_draft"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "organizer"
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "listing"
                ],
                "properties": {
                  "recordType": {
                    "const": "organizer_listing_draft"
                  },
                  "listing": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "listingId",
                      "requestId",
                      "kind",
                      "submittedBy",
                      "submittedAt",
                      "seed",
                      "organizer",
                      "fieldEvidence",
                      "eventCount",
                      "pastEventCount",
                      "pages",
                      "gaps",
                      "researchNeeded",
                      "contentHash"
                    ],
                    "properties": {
                      "listingId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "requestId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "kind": {
                        "enum": [
                          "nomination",
                          "self_submission",
                          "discovery"
                        ]
                      },
                      "submittedBy": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "role",
                          "uid",
                          "partnerId"
                        ],
                        "properties": {
                          "role": {
                            "enum": [
                              "associate",
                              "partner",
                              "organizer",
                              "system"
                            ]
                          },
                          "uid": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "partnerId": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          }
                        }
                      },
                      "submittedAt": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 40
                      },
                      "seed": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "name",
                          "urls",
                          "notes",
                          "categories"
                        ],
                        "properties": {
                          "name": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "urls": {
                            "type": "array",
                            "maxItems": 10,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 2000
                            }
                          },
                          "notes": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 2000
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "categories": {
                            "type": "array",
                            "maxItems": 40,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          }
                        }
                      },
                      "organizer": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "name",
                          "description",
                          "imageUrl",
                          "locality",
                          "categories",
                          "links",
                          "identityKeys"
                        ],
                        "properties": {
                          "name": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "description": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 2000
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "imageUrl": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 2000
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "locality": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "categories": {
                            "type": "array",
                            "maxItems": 40,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          },
                          "links": {
                            "type": "array",
                            "maxItems": 20,
                            "items": {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "platform",
                                "surfaceKind",
                                "url",
                                "normalizedKey",
                                "evidenceUrl"
                              ],
                              "properties": {
                                "platform": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                "surfaceKind": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                "url": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                },
                                "normalizedKey": {
                                  "anyOf": [
                                    {
                                      "type": "string",
                                      "minLength": 1,
                                      "maxLength": 500
                                    },
                                    {
                                      "type": "null"
                                    }
                                  ]
                                },
                                "evidenceUrl": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                }
                              }
                            }
                          },
                          "identityKeys": {
                            "type": "array",
                            "maxItems": 40,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          }
                        }
                      },
                      "fieldEvidence": {
                        "type": "array",
                        "maxItems": 20,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "field",
                            "sourceUrl",
                            "method",
                            "adapterId"
                          ],
                          "properties": {
                            "field": {
                              "enum": [
                                "name",
                                "description",
                                "imageUrl",
                                "locality"
                              ]
                            },
                            "sourceUrl": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            },
                            "method": {
                              "enum": [
                                "adapter",
                                "nominator",
                                "agent"
                              ]
                            },
                            "adapterId": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            }
                          }
                        }
                      },
                      "eventCount": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 60
                      },
                      "pastEventCount": {
                        "type": "integer",
                        "minimum": 0
                      },
                      "pages": {
                        "type": "array",
                        "maxItems": 12,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "url",
                            "via",
                            "platform",
                            "outcome",
                            "adapterId",
                            "pageKind",
                            "abstainReason",
                            "snapshotHash",
                            "capturedAt"
                          ],
                          "properties": {
                            "url": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 2000
                            },
                            "via": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 2000
                            },
                            "platform": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            },
                            "outcome": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            },
                            "adapterId": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            },
                            "pageKind": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            },
                            "abstainReason": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            },
                            "snapshotHash": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "pattern": "^[a-f0-9]{64}$"
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            },
                            "capturedAt": {
                              "anyOf": [
                                {
                                  "type": "string",
                                  "minLength": 10,
                                  "maxLength": 40
                                },
                                {
                                  "type": "null"
                                }
                              ]
                            }
                          }
                        }
                      },
                      "gaps": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "researchNeeded": {
                        "type": "boolean"
                      },
                      "contentHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "listing_event_candidate"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "event"
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "event"
                ],
                "properties": {
                  "recordType": {
                    "const": "listing_event_candidate"
                  },
                  "event": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "listingId",
                      "listingWorkItemId",
                      "requestId",
                      "eventKey",
                      "platform",
                      "sourceEntityId",
                      "title",
                      "description",
                      "startAt",
                      "endAt",
                      "timezone",
                      "venue",
                      "address",
                      "locality",
                      "latitude",
                      "longitude",
                      "sourceUrl",
                      "imageUrl",
                      "price",
                      "status",
                      "attendanceMode",
                      "organizerName",
                      "organizerUrl",
                      "adapterId",
                      "evidenceFields",
                      "alsoListedAt"
                    ],
                    "properties": {
                      "listingId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "listingWorkItemId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "requestId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "eventKey": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "platform": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "sourceEntityId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "title": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "description": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 2000
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "startAt": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 40
                      },
                      "endAt": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 10,
                            "maxLength": 40
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "timezone": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "venue": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "address": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "locality": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "latitude": {
                        "anyOf": [
                          {
                            "type": "number",
                            "minimum": -90,
                            "maximum": 90
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "longitude": {
                        "anyOf": [
                          {
                            "type": "number",
                            "minimum": -180,
                            "maximum": 180
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "sourceUrl": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      },
                      "imageUrl": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 2000
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "price": {
                        "anyOf": [
                          {
                            "type": "object",
                            "maxProperties": 8
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "status": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "attendanceMode": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "organizerName": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "organizerUrl": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 2000
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "adapterId": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "evidenceFields": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "alsoListedAt": {
                        "type": "array",
                        "maxItems": 10,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 2000
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "liveCheckpointReport"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "checkpoint_report"
          },
          "normalizedPayload": {
            "title": "EventAssistanceCheckpointWork",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "scope",
              "rosterId",
              "rosterHash",
              "request",
              "requestedAt",
              "checkpoint"
            ],
            "properties": {
              "schemaVersion": {
                "const": 1
              },
              "kind": {
                "const": "liveCheckpointReport"
              },
              "scope": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "context",
                  "groupId",
                  "checkpointId",
                  "progressRevision"
                ],
                "properties": {
                  "context": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "mode",
                      "eventId",
                      "organizerId"
                    ],
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "live"
                      },
                      "eventId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 160,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "organizerId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      }
                    }
                  },
                  "groupId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 160,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "checkpointId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  },
                  "progressRevision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  }
                }
              },
              "rosterId": {
                "type": "string",
                "pattern": "^departure-roster:[a-f0-9]{64}$"
              },
              "rosterHash": {
                "type": "string",
                "pattern": "^[a-f0-9]{64}$"
              },
              "request": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "responsibleOperatorId",
                  "dueAt"
                ],
                "properties": {
                  "responsibleOperatorId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128,
                    "pattern": "^[^/]+$"
                  },
                  "dueAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                }
              },
              "requestedAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "checkpoint": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "dueAt",
                  "evaluatedAt",
                  "failures",
                  "observation"
                ],
                "properties": {
                  "dueAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "evaluatedAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "failures": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 5
                  },
                  "observation": {
                    "anyOf": [
                      {
                        "oneOf": [
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "request",
                              "reportRevision",
                              "sourceHash",
                              "ownerValidUntil"
                            ],
                            "properties": {
                              "kind": {
                                "const": "observed"
                              },
                              "request": {
                                "oneOf": [
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "responsibleOperatorId",
                                      "dueAt",
                                      "state",
                                      "ownerAvailability"
                                    ],
                                    "properties": {
                                      "responsibleOperatorId": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 128,
                                        "pattern": "^[^/]+$"
                                      },
                                      "dueAt": {
                                        "type": "integer",
                                        "minimum": 0,
                                        "maximum": 9007199254740991
                                      },
                                      "state": {
                                        "enum": [
                                          "awaitingReport",
                                          "overdue",
                                          "discrepancy",
                                          "sourceUnavailable"
                                        ]
                                      },
                                      "ownerAvailability": {
                                        "enum": [
                                          "current",
                                          "needsReassignment"
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "responsibleOperatorId",
                                      "dueAt",
                                      "state",
                                      "ownerAvailability"
                                    ],
                                    "properties": {
                                      "responsibleOperatorId": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 128,
                                        "pattern": "^[^/]+$"
                                      },
                                      "dueAt": {
                                        "type": "integer",
                                        "minimum": 0,
                                        "maximum": 9007199254740991
                                      },
                                      "state": {
                                        "enum": [
                                          "complete",
                                          "closedOut"
                                        ]
                                      },
                                      "ownerAvailability": {
                                        "const": "notRequired"
                                      }
                                    }
                                  }
                                ]
                              },
                              "reportRevision": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 9007199254740991
                              },
                              "sourceHash": {
                                "type": "string",
                                "pattern": "^[a-f0-9]{64}$"
                              },
                              "ownerValidUntil": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 9007199254740991
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "reason"
                            ],
                            "properties": {
                              "kind": {
                                "const": "unavailable"
                              },
                              "reason": {
                                "const": "factsUnavailable"
                              }
                            }
                          }
                        ]
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                }
              },
              "reassignment": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "revision",
                  "receiptId",
                  "responsibleOperatorId",
                  "previousResponsibleOperatorId",
                  "assignedBy",
                  "assignedAt",
                  "reason"
                ],
                "properties": {
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  },
                  "receiptId": {
                    "type": "string",
                    "pattern": "^checkpoint-reassignment:[a-f0-9]{64}$"
                  },
                  "responsibleOperatorId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128,
                    "pattern": "^[^/]+$"
                  },
                  "previousResponsibleOperatorId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128,
                    "pattern": "^[^/]+$"
                  },
                  "assignedBy": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128,
                    "pattern": "^[^/]+$"
                  },
                  "assignedAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "reason": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500,
                    "pattern": "\\S"
                  }
                }
              },
              "closeout": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "revision",
                  "previousRevision",
                  "receiptId",
                  "changedBy",
                  "changedAt",
                  "reason",
                  "decision"
                ],
                "properties": {
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  },
                  "previousRevision": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "receiptId": {
                    "type": "string",
                    "pattern": "^checkpoint-closeout:[a-f0-9]{64}$"
                  },
                  "changedBy": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 128,
                    "pattern": "^[^/]+$"
                  },
                  "changedAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "reason": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500,
                    "pattern": "\\S"
                  },
                  "decision": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "kind",
                          "report",
                          "dispositions"
                        ],
                        "properties": {
                          "kind": {
                            "const": "close"
                          },
                          "report": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "schemaVersion",
                              "reportId",
                              "context",
                              "groupId",
                              "checkpointId",
                              "progressRevision",
                              "rosterId",
                              "rosterHash",
                              "revision",
                              "accountedFor",
                              "reportedBy",
                              "reportedAt",
                              "correctionReason",
                              "createdAt"
                            ],
                            "properties": {
                              "schemaVersion": {
                                "const": 1
                              },
                              "reportId": {
                                "type": "string",
                                "pattern": "^checkpoint:[a-f0-9]{64}$"
                              },
                              "context": {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "mode",
                                  "eventId",
                                  "organizerId"
                                ],
                                "properties": {
                                  "mode": {
                                    "type": "string",
                                    "const": "live"
                                  },
                                  "eventId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 160,
                                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                  },
                                  "organizerId": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 2000
                                  }
                                }
                              },
                              "groupId": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 160,
                                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                              },
                              "checkpointId": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 2000
                              },
                              "progressRevision": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 9007199254740991
                              },
                              "rosterId": {
                                "type": "string",
                                "pattern": "^departure-roster:[a-f0-9]{64}$"
                              },
                              "rosterHash": {
                                "type": "string",
                                "pattern": "^[a-f0-9]{64}$"
                              },
                              "revision": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 9007199254740991
                              },
                              "accountedFor": {
                                "type": "array",
                                "items": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 160,
                                  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                },
                                "uniqueItems": true,
                                "maxItems": 1000
                              },
                              "reportedBy": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 2000
                              },
                              "reportedAt": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 9007199254740991
                              },
                              "correctionReason": {
                                "anyOf": [
                                  {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500,
                                    "pattern": "\\S"
                                  },
                                  {
                                    "type": "null"
                                  }
                                ]
                              },
                              "createdAt": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 9007199254740991
                              }
                            }
                          },
                          "dispositions": {
                            "type": "array",
                            "maxItems": 1000,
                            "items": {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "kind",
                                "disposition",
                                "revision",
                                "resolvedAt",
                                "resolvedBy",
                                "sourceHash",
                                "attendeeId"
                              ],
                              "properties": {
                                "kind": {
                                  "const": "resolved"
                                },
                                "disposition": {
                                  "enum": [
                                    "returned",
                                    "departed"
                                  ]
                                },
                                "revision": {
                                  "type": "integer",
                                  "minimum": 1,
                                  "maximum": 9007199254740991
                                },
                                "resolvedAt": {
                                  "type": "integer",
                                  "minimum": 0,
                                  "maximum": 9007199254740991
                                },
                                "resolvedBy": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 128,
                                  "pattern": "^[^/]+$"
                                },
                                "sourceHash": {
                                  "type": "string",
                                  "pattern": "^[a-f0-9]{64}$"
                                },
                                "attendeeId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 160,
                                  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "kind"
                        ],
                        "properties": {
                          "kind": {
                            "const": "reopen"
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "operationalNoticeFanout"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "notice_fanout"
          },
          "normalizedPayload": {
            "title": "EventAssistanceOperationalNoticeFanout",
            "description": "Private bounded attendee fanout for one trusted plan-change or post-event source. The work binds a reviewed policy revision and grants no provider authority by itself.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "signalId",
              "context",
              "source",
              "policyBinding",
              "expiresAt",
              "checkpoint"
            ],
            "properties": {
              "schemaVersion": {
                "type": "integer",
                "const": 1
              },
              "kind": {
                "type": "string",
                "const": "operationalNoticeFanout"
              },
              "signalId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "context": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "mode",
                  "eventId",
                  "organizerId"
                ],
                "properties": {
                  "mode": {
                    "type": "string",
                    "const": "live"
                  },
                  "eventId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 160,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "organizerId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  }
                }
              },
              "source": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "kind",
                  "sourceId",
                  "revision",
                  "occurredAt",
                  "validUntil"
                ],
                "properties": {
                  "kind": {
                    "type": "string",
                    "enum": [
                      "planChange",
                      "followUp"
                    ]
                  },
                  "sourceId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  },
                  "occurredAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "validUntil": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  }
                }
              },
              "policyBinding": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "groupId",
                  "workflowKind",
                  "settingId",
                  "settingRevision"
                ],
                "properties": {
                  "groupId": {
                    "type": "string",
                    "const": "event:whole"
                  },
                  "workflowKind": {
                    "type": "string",
                    "enum": [
                      "planChangeCommunication",
                      "postEventFollowUp"
                    ]
                  },
                  "settingId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "settingRevision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  }
                }
              },
              "expiresAt": {
                "type": "integer",
                "minimum": 1,
                "maximum": 9007199254740991
              },
              "checkpoint": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "phase",
                  "cursor",
                  "visited",
                  "published",
                  "skipped",
                  "dueAt",
                  "failures",
                  "retries",
                  "stopReason"
                ],
                "properties": {
                  "phase": {
                    "type": "string",
                    "enum": [
                      "scan",
                      "retry",
                      "complete",
                      "review",
                      "expired",
                      "stopped"
                    ]
                  },
                  "cursor": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "visited": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "published": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "skipped": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "dueAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "failures": {
                    "type": "array",
                    "maxItems": 100,
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "attendeeId",
                        "reason"
                      ],
                      "properties": {
                        "attendeeId": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 180,
                          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                        },
                        "reason": {
                          "type": "string",
                          "enum": [
                            "unavailable"
                          ]
                        }
                      }
                    }
                  },
                  "retries": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 5
                  },
                  "stopReason": {
                    "enum": [
                      null,
                      "policyUnavailable",
                      "policyChanged",
                      "sourceChanged"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "liveMessageDelivery"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "message_delivery"
          },
          "normalizedPayload": {
            "title": "EventAssistanceDeliveryWork",
            "description": "Private resumable delivery coordination for one published automatic message. The outbox owns provider attempts; a checkpoint never grants dispatch authority.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "messageId",
              "intentHash",
              "threadId",
              "scope",
              "createdAt",
              "expiresAt",
              "checkpoint"
            ],
            "properties": {
              "schemaVersion": {
                "type": "integer",
                "const": 1
              },
              "kind": {
                "type": "string",
                "const": "liveMessageDelivery"
              },
              "messageId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "intentHash": {
                "type": "string",
                "pattern": "^[a-f0-9]{64}$"
              },
              "threadId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "scope": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "context",
                  "attendeeId",
                  "episodeId"
                ],
                "properties": {
                  "context": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "mode",
                      "eventId",
                      "organizerId"
                    ],
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "live"
                      },
                      "eventId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 160,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "organizerId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      }
                    }
                  },
                  "attendeeId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "episodeId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  }
                }
              },
              "createdAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "expiresAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "checkpoint": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "phase",
                      "reason",
                      "dueAt",
                      "messageRevision",
                      "messageHash",
                      "failures",
                      "evaluations"
                    ],
                    "properties": {
                      "phase": {
                        "type": "string",
                        "const": "queued"
                      },
                      "reason": {
                        "type": "null"
                      },
                      "dueAt": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageRevision": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "failures": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5,
                        "const": 0
                      },
                      "evaluations": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "const": 0
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "phase",
                      "reason",
                      "dueAt",
                      "messageRevision",
                      "messageHash",
                      "failures",
                      "evaluations"
                    ],
                    "properties": {
                      "phase": {
                        "type": "string",
                        "const": "complete"
                      },
                      "reason": {
                        "enum": [
                          "delivered",
                          "responded",
                          "cancelled",
                          "superseded",
                          "expired",
                          "eventClosed",
                          "permissionRevoked",
                          "guestPresent",
                          "guestDeclined",
                          "notAdmitted",
                          "hostStopped",
                          "participationInactive"
                        ]
                      },
                      "dueAt": {
                        "type": "null"
                      },
                      "messageRevision": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "failures": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5
                      },
                      "evaluations": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "phase",
                      "reason",
                      "dueAt",
                      "messageRevision",
                      "messageHash",
                      "failures",
                      "evaluations"
                    ],
                    "properties": {
                      "phase": {
                        "type": "string",
                        "const": "receipt"
                      },
                      "reason": {
                        "const": "providerPending"
                      },
                      "dueAt": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageRevision": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "failures": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5
                      },
                      "evaluations": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "phase",
                      "reason",
                      "dueAt",
                      "messageRevision",
                      "messageHash",
                      "failures",
                      "evaluations"
                    ],
                    "properties": {
                      "phase": {
                        "type": "string",
                        "const": "retry"
                      },
                      "reason": {
                        "enum": [
                          "retryBackoff",
                          "eventFactsStale",
                          "routeFactsStale",
                          "workerUnavailable"
                        ]
                      },
                      "dueAt": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageRevision": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "failures": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5
                      },
                      "evaluations": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "phase",
                      "reason",
                      "dueAt",
                      "messageRevision",
                      "messageHash",
                      "failures",
                      "evaluations"
                    ],
                    "properties": {
                      "phase": {
                        "type": "string",
                        "const": "review"
                      },
                      "reason": {
                        "enum": [
                          "noEligibleRoute",
                          "attemptLimit",
                          "policyRejected",
                          "recipientNeedsReview",
                          "providerOwnsFallback",
                          "conflictingDeliveryEvidence",
                          "providerPending",
                          "workerUnavailable",
                          "recoveryLimit",
                          "eventFactsStale",
                          "routeFactsStale"
                        ]
                      },
                      "dueAt": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageRevision": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "messageHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "failures": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 5
                      },
                      "evaluations": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "liveRosterEnrollment"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "runtime_roster"
          },
          "normalizedPayload": {
            "title": "EventAssistanceRosterWork",
            "description": "Private resumable roster enrollment bound to current manager runtime permission. Enrollment never infers attendance or sends messages.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "signalId",
              "source",
              "scope",
              "expiresAt",
              "checkpoint",
              "runtimeBinding"
            ],
            "properties": {
              "schemaVersion": {
                "const": 1,
                "type": "integer"
              },
              "kind": {
                "const": "liveRosterEnrollment",
                "type": "string"
              },
              "signalId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "source": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "eventId",
                  "collection",
                  "documentId",
                  "occurredAt"
                ],
                "properties": {
                  "eventId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "collection": {
                    "type": "string",
                    "enum": [
                      "eventAttendees",
                      "eventAssistanceGuests",
                      "eventAssistanceRuntimeConfigs"
                    ]
                  },
                  "documentId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "occurredAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                }
              },
              "scope": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "context",
                  "attendeeId"
                ],
                "properties": {
                  "context": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "mode",
                      "eventId",
                      "organizerId"
                    ],
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "live"
                      },
                      "eventId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 160,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "organizerId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      }
                    }
                  },
                  "attendeeId": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                }
              },
              "expiresAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "checkpoint": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "phase",
                  "cursor",
                  "visited",
                  "dueAt",
                  "failures",
                  "retries",
                  "stopReason"
                ],
                "properties": {
                  "phase": {
                    "type": "string",
                    "enum": [
                      "scan",
                      "retry",
                      "complete",
                      "review",
                      "expired",
                      "stopped"
                    ]
                  },
                  "cursor": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "visited": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "dueAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "failures": {
                    "type": "array",
                    "maxItems": 100,
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "attendeeId",
                        "reason"
                      ],
                      "properties": {
                        "reason": {
                          "type": "string",
                          "enum": [
                            "busy",
                            "unavailable"
                          ]
                        },
                        "attendeeId": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 180,
                          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                        }
                      }
                    }
                  },
                  "retries": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 5
                  },
                  "stopReason": {
                    "enum": [
                      null,
                      "missing",
                      "paused",
                      "configurationChanged",
                      "sourceChanged",
                      "expired",
                      "eventClosed"
                    ]
                  }
                }
              },
              "runtimeBinding": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "runtimeId",
                  "revision"
                ],
                "properties": {
                  "runtimeId": {
                    "type": "string",
                    "pattern": "^runtime:lateJoin:[a-f0-9]{64}$"
                  },
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "liveSourceWake"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "source_signal"
          },
          "normalizedPayload": {
            "title": "EventAssistanceSourceWork",
            "description": "Private bounded source-change fanout using Operations work items. Waking work grants no domain or provider authority.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "signalId",
              "source",
              "scope",
              "expiresAt",
              "checkpoint"
            ],
            "properties": {
              "schemaVersion": {
                "const": 1,
                "type": "integer"
              },
              "kind": {
                "const": "liveSourceWake",
                "type": "string"
              },
              "signalId": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              },
              "source": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "eventId",
                  "collection",
                  "documentId",
                  "occurredAt"
                ],
                "properties": {
                  "eventId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "collection": {
                    "type": "string",
                    "enum": [
                      "events",
                      "eventAttendees",
                      "eventSuccessPlans",
                      "eventAssistanceGuests",
                      "eventAssistanceSettings",
                      "eventAssistanceGroupProgress",
                      "eventAssistanceMemberships",
                      "eventAssistanceMessages",
                      "eventAssistanceRuntimeConfigs",
                      "eventAssistanceSmsPermissions",
                      "eventAssistanceWhatsappPermissions",
                      "eventAssistanceSmsSenders",
                      "eventAssistanceSmsBudgets",
                      "organizerSenderConnections",
                      "eventAssistanceWhatsappPolicies",
                      "organizerMessageTemplates",
                      "eventAssistanceWhatsappBudgets",
                      "organizerWhatsappEndpointStops",
                      "organizerContactChannelStates",
                      "eventStaffGrants",
                      "eventAssistanceRcsPermissions",
                      "eventAssistanceRcsSenders",
                      "eventAssistanceRcsBudgets",
                      "eventAssistanceRcsSubscriptions"
                    ]
                  },
                  "documentId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "occurredAt": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                }
              },
              "scope": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "context",
                      "attendeeId"
                    ],
                    "properties": {
                      "context": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "mode",
                          "eventId",
                          "organizerId"
                        ],
                        "properties": {
                          "mode": {
                            "type": "string",
                            "const": "live"
                          },
                          "eventId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 160,
                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                          },
                          "organizerId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 2000
                          }
                        }
                      },
                      "attendeeId": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 180,
                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "description": "Refresh only existing checkpoint requests whose immutable departure roster contains this attendee. Never enroll guests or dispatch messages.",
                    "required": [
                      "kind",
                      "context",
                      "attendeeId"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "checkpointMember"
                      },
                      "context": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "mode",
                          "eventId",
                          "organizerId"
                        ],
                        "properties": {
                          "mode": {
                            "type": "string",
                            "const": "live"
                          },
                          "eventId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 160,
                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                          },
                          "organizerId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 2000
                          }
                        }
                      },
                      "attendeeId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "routeId",
                      "senderId"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "sender"
                      },
                      "routeId": {
                        "type": "string",
                        "enum": [
                          "catchEventSms",
                          "organizerEventWhatsapp",
                          "catchEventRcs"
                        ]
                      },
                      "senderId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "organizerId",
                      "recipientEndpointId"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "whatsappEndpoint"
                      },
                      "organizerId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "recipientEndpointId": {
                        "type": "string",
                        "pattern": "^whatsapp:[a-f0-9]{64}$"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "kind",
                      "subscriptionId"
                    ],
                    "properties": {
                      "kind": {
                        "type": "string",
                        "const": "rcsSubscription"
                      },
                      "subscriptionId": {
                        "type": "string",
                        "pattern": "^rcs-subscription:[a-f0-9]{64}$"
                      }
                    }
                  }
                ]
              },
              "expiresAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "checkpoint": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "phase",
                  "cursor",
                  "visited",
                  "dueAt",
                  "failures",
                  "retries"
                ],
                "properties": {
                  "phase": {
                    "type": "string",
                    "enum": [
                      "scan",
                      "retry",
                      "complete",
                      "review",
                      "expired"
                    ]
                  },
                  "cursor": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "visited": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "dueAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "failures": {
                    "type": "array",
                    "maxItems": 100,
                    "items": {
                      "oneOf": [
                        {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "workItemId",
                            "reason"
                          ],
                          "properties": {
                            "workItemId": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 180,
                              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                            },
                            "reason": {
                              "type": "string",
                              "enum": [
                                "busy",
                                "unavailable"
                              ]
                            }
                          }
                        },
                        {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "targetKey",
                            "reason"
                          ],
                          "properties": {
                            "targetKey": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 180,
                              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                            },
                            "reason": {
                              "type": "string",
                              "enum": [
                                "busy",
                                "unavailable"
                              ]
                            }
                          }
                        }
                      ]
                    }
                  },
                  "retries": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 5
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "liveLateJoin"
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "workflowId": {
            "const": "event-assistance"
          },
          "entityKind": {
            "const": "guest_episode"
          },
          "normalizedPayload": {
            "title": "EventAssistanceLiveWork",
            "description": "Private normalized payload for one durable live guest episode. Due times and evaluation state are explicit; publication is not provider delivery.",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "schemaVersion",
              "kind",
              "scope",
              "options",
              "expiresAt",
              "maxEvaluations",
              "checkpoint"
            ],
            "properties": {
              "schemaVersion": {
                "type": "integer",
                "const": 1
              },
              "kind": {
                "type": "string",
                "const": "liveLateJoin"
              },
              "scope": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "context",
                  "attendeeId",
                  "episodeId"
                ],
                "properties": {
                  "context": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "mode",
                      "eventId",
                      "organizerId"
                    ],
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "live"
                      },
                      "eventId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 160,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "organizerId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      }
                    }
                  },
                  "attendeeId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  },
                  "episodeId": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 180,
                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                  }
                }
              },
              "options": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "routes",
                  "responseDeadline",
                  "deliveryPolicy"
                ],
                "properties": {
                  "routes": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 3,
                    "uniqueItems": true,
                    "items": {
                      "oneOf": [
                        {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "routeId",
                            "senderId"
                          ],
                          "properties": {
                            "routeId": {
                              "type": "string",
                              "const": "catchEventSms"
                            },
                            "senderId": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 160,
                              "pattern": "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$"
                            }
                          }
                        },
                        {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "routeId",
                            "senderId"
                          ],
                          "properties": {
                            "routeId": {
                              "type": "string",
                              "const": "organizerEventWhatsapp"
                            },
                            "senderId": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 160,
                              "pattern": "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$"
                            }
                          }
                        },
                        {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "routeId",
                            "senderId"
                          ],
                          "properties": {
                            "routeId": {
                              "type": "string",
                              "const": "catchEventRcs"
                            },
                            "senderId": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 160,
                              "pattern": "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$"
                            }
                          }
                        }
                      ]
                    }
                  },
                  "responseDeadline": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  },
                  "deliveryPolicy": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "maxAttempts",
                      "maxAttemptsPerRoute",
                      "minimumRetrySeconds"
                    ],
                    "properties": {
                      "maxAttempts": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 6
                      },
                      "maxAttemptsPerRoute": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 3
                      },
                      "minimumRetrySeconds": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 3600
                      }
                    }
                  },
                  "laterChoices": {
                    "type": "array",
                    "maxItems": 17,
                    "items": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "label",
                        "target"
                      ],
                      "properties": {
                        "label": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 80
                        },
                        "target": {
                          "anyOf": [
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "kind",
                                "placeId",
                                "lateEntry"
                              ],
                              "properties": {
                                "kind": {
                                  "type": "string",
                                  "const": "fixedPlace"
                                },
                                "placeId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 160,
                                  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                },
                                "lateEntry": {
                                  "type": "string",
                                  "enum": [
                                    "allowed",
                                    "hostDecision",
                                    "closed"
                                  ]
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "kind",
                                "itineraryId",
                                "stopId"
                              ],
                              "properties": {
                                "kind": {
                                  "type": "string",
                                  "const": "itineraryStop"
                                },
                                "itineraryId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                },
                                "stopId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                }
                              }
                            },
                            {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "kind",
                                "routeId",
                                "groupId",
                                "checkpointId"
                              ],
                              "properties": {
                                "kind": {
                                  "type": "string",
                                  "const": "groupCheckpoint"
                                },
                                "routeId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                },
                                "groupId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 160,
                                  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                },
                                "checkpointId": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 2000
                                }
                              }
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              },
              "expiresAt": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "maxEvaluations": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10000
              },
              "checkpoint": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "dueAt",
                  "evaluatedAt",
                  "evaluations",
                  "sourceHash",
                  "observation",
                  "publication"
                ],
                "properties": {
                  "dueAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  },
                  "evaluatedAt": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  },
                  "evaluations": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 10000
                  },
                  "sourceHash": {
                    "anyOf": [
                      {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  },
                  "observation": {
                    "anyOf": [
                      {
                        "oneOf": [
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "decision"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "decision"
                              },
                              "decision": {
                                "anyOf": [
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "reason"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "resolved"
                                      },
                                      "reason": {
                                        "type": "string",
                                        "enum": [
                                          "joined",
                                          "declined"
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "reason"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "cancelled"
                                      },
                                      "reason": {
                                        "type": "string",
                                        "enum": [
                                          "eventClosed",
                                          "notAdmitted",
                                          "policyDisabled",
                                          "participationInactive"
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "reason"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "expired"
                                      },
                                      "reason": {
                                        "type": "string",
                                        "enum": [
                                          "cutoff",
                                          "lateEntryClosed"
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "reason"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "wait"
                                      },
                                      "reason": {
                                        "type": "string",
                                        "enum": [
                                          "departureUnconfirmed",
                                          "attendanceUnknown",
                                          "guidanceUnavailable",
                                          "throttled",
                                          "unchanged",
                                          "participationUnknown"
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "reason",
                                      "guidance"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "hostDecision"
                                      },
                                      "reason": {
                                        "type": "string",
                                        "enum": [
                                          "unreachable",
                                          "entryDecision",
                                          "missingInformation"
                                        ]
                                      },
                                      "guidance": {
                                        "anyOf": [
                                          {
                                            "type": "object",
                                            "additionalProperties": false,
                                            "required": [
                                              "revision",
                                              "destination",
                                              "materialKey",
                                              "text",
                                              "validUntil"
                                            ],
                                            "properties": {
                                              "revision": {
                                                "type": "integer",
                                                "minimum": 0,
                                                "maximum": 9007199254740991,
                                                "description": "Nonnegative safe integer revision."
                                              },
                                              "destination": {
                                                "anyOf": [
                                                  {
                                                    "type": "object",
                                                    "additionalProperties": false,
                                                    "required": [
                                                      "kind",
                                                      "placeId",
                                                      "lateEntry"
                                                    ],
                                                    "properties": {
                                                      "kind": {
                                                        "type": "string",
                                                        "const": "fixedPlace"
                                                      },
                                                      "placeId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 160,
                                                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                                      },
                                                      "lateEntry": {
                                                        "type": "string",
                                                        "enum": [
                                                          "allowed",
                                                          "hostDecision",
                                                          "closed"
                                                        ]
                                                      }
                                                    }
                                                  },
                                                  {
                                                    "type": "object",
                                                    "additionalProperties": false,
                                                    "required": [
                                                      "kind",
                                                      "itineraryId",
                                                      "stopId"
                                                    ],
                                                    "properties": {
                                                      "kind": {
                                                        "type": "string",
                                                        "const": "itineraryStop"
                                                      },
                                                      "itineraryId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 2000
                                                      },
                                                      "stopId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 2000
                                                      }
                                                    }
                                                  },
                                                  {
                                                    "type": "object",
                                                    "additionalProperties": false,
                                                    "required": [
                                                      "kind",
                                                      "routeId",
                                                      "groupId",
                                                      "checkpointId"
                                                    ],
                                                    "properties": {
                                                      "kind": {
                                                        "type": "string",
                                                        "const": "groupCheckpoint"
                                                      },
                                                      "routeId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 2000
                                                      },
                                                      "groupId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 160,
                                                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                                      },
                                                      "checkpointId": {
                                                        "type": "string",
                                                        "minLength": 1,
                                                        "maxLength": 2000
                                                      }
                                                    }
                                                  }
                                                ]
                                              },
                                              "materialKey": {
                                                "type": "string",
                                                "minLength": 1,
                                                "maxLength": 2000
                                              },
                                              "text": {
                                                "type": "string",
                                                "minLength": 1,
                                                "maxLength": 2000
                                              },
                                              "validUntil": {
                                                "type": "integer",
                                                "minimum": 0,
                                                "maximum": 9007199254740991,
                                                "description": "UTC milliseconds."
                                              }
                                            }
                                          },
                                          {
                                            "type": "null",
                                            "const": null
                                          }
                                        ]
                                      }
                                    }
                                  },
                                  {
                                    "type": "object",
                                    "additionalProperties": false,
                                    "required": [
                                      "kind",
                                      "guidance",
                                      "messageKey",
                                      "shouldSend",
                                      "nextEvaluationAt"
                                    ],
                                    "properties": {
                                      "kind": {
                                        "type": "string",
                                        "const": "update"
                                      },
                                      "guidance": {
                                        "type": "object",
                                        "additionalProperties": false,
                                        "required": [
                                          "revision",
                                          "destination",
                                          "materialKey",
                                          "text",
                                          "validUntil"
                                        ],
                                        "properties": {
                                          "revision": {
                                            "type": "integer",
                                            "minimum": 0,
                                            "maximum": 9007199254740991,
                                            "description": "Nonnegative safe integer revision."
                                          },
                                          "destination": {
                                            "anyOf": [
                                              {
                                                "type": "object",
                                                "additionalProperties": false,
                                                "required": [
                                                  "kind",
                                                  "placeId",
                                                  "lateEntry"
                                                ],
                                                "properties": {
                                                  "kind": {
                                                    "type": "string",
                                                    "const": "fixedPlace"
                                                  },
                                                  "placeId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 160,
                                                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                                  },
                                                  "lateEntry": {
                                                    "type": "string",
                                                    "enum": [
                                                      "allowed",
                                                      "hostDecision",
                                                      "closed"
                                                    ]
                                                  }
                                                }
                                              },
                                              {
                                                "type": "object",
                                                "additionalProperties": false,
                                                "required": [
                                                  "kind",
                                                  "itineraryId",
                                                  "stopId"
                                                ],
                                                "properties": {
                                                  "kind": {
                                                    "type": "string",
                                                    "const": "itineraryStop"
                                                  },
                                                  "itineraryId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 2000
                                                  },
                                                  "stopId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 2000
                                                  }
                                                }
                                              },
                                              {
                                                "type": "object",
                                                "additionalProperties": false,
                                                "required": [
                                                  "kind",
                                                  "routeId",
                                                  "groupId",
                                                  "checkpointId"
                                                ],
                                                "properties": {
                                                  "kind": {
                                                    "type": "string",
                                                    "const": "groupCheckpoint"
                                                  },
                                                  "routeId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 2000
                                                  },
                                                  "groupId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 160,
                                                    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                                                  },
                                                  "checkpointId": {
                                                    "type": "string",
                                                    "minLength": 1,
                                                    "maxLength": 2000
                                                  }
                                                }
                                              }
                                            ]
                                          },
                                          "materialKey": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 2000
                                          },
                                          "text": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 2000
                                          },
                                          "validUntil": {
                                            "type": "integer",
                                            "minimum": 0,
                                            "maximum": 9007199254740991,
                                            "description": "UTC milliseconds."
                                          }
                                        }
                                      },
                                      "messageKey": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 2000
                                      },
                                      "shouldSend": {
                                        "type": "boolean"
                                      },
                                      "nextEvaluationAt": {
                                        "anyOf": [
                                          {
                                            "type": "integer",
                                            "minimum": 0,
                                            "maximum": 9007199254740991
                                          },
                                          {
                                            "type": "null"
                                          }
                                        ]
                                      }
                                    }
                                  }
                                ],
                                "title": "EventAssistanceLateJoinDecision"
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "reason"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "sourceNotReady"
                              },
                              "reason": {
                                "type": "string",
                                "enum": [
                                  "episodeMissing",
                                  "guestSourceChanged",
                                  "membershipMissing",
                                  "membershipSourceChanged",
                                  "unconfigured",
                                  "disabled",
                                  "settingSourceChanged",
                                  "eventClosed",
                                  "runtimeNotLive",
                                  "progressUnconfirmed",
                                  "progressSourceChanged",
                                  "destinationUnavailable"
                                ]
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "reason"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "historyUnavailable"
                              },
                              "reason": {
                                "type": "string",
                                "enum": [
                                  "historyLimit",
                                  "deliveryConflict",
                                  "ambiguousHistory"
                                ]
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "responseDeadlineMissing"
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "episodeChanged"
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "workExpired"
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "evaluationLimit"
                              }
                            }
                          },
                          {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "kind",
                              "reason"
                            ],
                            "properties": {
                              "kind": {
                                "type": "string",
                                "const": "runtimeUnavailable"
                              },
                              "reason": {
                                "type": "string",
                                "enum": [
                                  "missing",
                                  "paused",
                                  "configurationChanged",
                                  "sourceChanged",
                                  "expired",
                                  "eventClosed"
                                ]
                              }
                            }
                          }
                        ]
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  },
                  "publication": {
                    "anyOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "messageId",
                          "threadId"
                        ],
                        "properties": {
                          "messageId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 180,
                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                          },
                          "threadId": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 180,
                            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                          }
                        }
                      },
                      {
                        "type": "null",
                        "const": null
                      }
                    ]
                  }
                }
              },
              "runtimeBinding": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "runtimeId",
                  "revision"
                ],
                "properties": {
                  "runtimeId": {
                    "type": "string",
                    "pattern": "^runtime:lateJoin:[a-f0-9]{64}$"
                  },
                  "revision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 9007199254740991
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "lifecycleStatus": {
            "const": "terminal"
          }
        }
      },
      "then": {
        "properties": {
          "outcome": {
            "type": "string",
            "not": {
              "const": "published"
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "lifecycleStatus": {
            "const": "published"
          }
        }
      },
      "then": {
        "properties": {
          "outcome": {
            "const": "published"
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "lifecycleStatus": {
            "enum": [
              "queued",
              "in_progress",
              "waiting",
              "ready"
            ]
          }
        }
      },
      "then": {
        "properties": {
          "outcome": {
            "type": "null"
          }
        }
      }
    },
    {
      "if": {
        "anyOf": [
          {
            "required": [
              "blockerCodes"
            ],
            "properties": {
              "blockerCodes": {
                "contains": {
                  "const": "human_review_required"
                }
              }
            }
          },
          {
            "required": [
              "normalizedPayload"
            ],
            "properties": {
              "normalizedPayload": {
                "type": "object",
                "required": [
                  "owner"
                ],
                "properties": {
                  "owner": {
                    "const": "human"
                  }
                }
              }
            }
          }
        ]
      },
      "then": {
        "properties": {
          "taskFlags": {
            "contains": {
              "const": "human_review_required"
            }
          }
        }
      }
    },
    {
      "if": {
        "required": [
          "lifecycleStatus"
        ],
        "properties": {
          "lifecycleStatus": {
            "enum": [
              "published",
              "terminal"
            ]
          }
        }
      },
      "then": {
        "properties": {
          "taskFlags": {
            "not": {
              "contains": {
                "const": "human_review_required"
              }
            }
          },
          "blockerCodes": {
            "not": {
              "contains": {
                "const": "human_review_required"
              }
            }
          },
          "normalizedPayload": {
            "not": {
              "required": [
                "owner"
              ],
              "properties": {
                "owner": {
                  "const": "human"
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "organizer_publication_packet"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "packet"
                ],
                "properties": {
                  "recordType": {
                    "const": "organizer_publication_packet"
                  },
                  "packet": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "packetId",
                      "entityId",
                      "canonicalHostId",
                      "displayName",
                      "status",
                      "priority",
                      "markets",
                      "blockers",
                      "dataBlockers",
                      "evidenceBlockers",
                      "approvalChecklist",
                      "evidenceSummary",
                      "publicPresence",
                      "adminDecision",
                      "nextActions"
                    ],
                    "properties": {
                      "packetId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "entityId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "canonicalHostId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "displayName": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "status": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "priority": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "markets": {
                        "type": "array",
                        "maxItems": 8,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "slug",
                            "displayName"
                          ],
                          "properties": {
                            "slug": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            },
                            "displayName": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          }
                        }
                      },
                      "blockers": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "dataBlockers": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "evidenceBlockers": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "approvalChecklist": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "crawlDisabledReviewed",
                          "identityReviewed",
                          "marketScopeReviewed",
                          "mediaRightsReviewed",
                          "ownerSafeCopyReviewed",
                          "surfaceInventoryReviewed"
                        ],
                        "properties": {
                          "crawlDisabledReviewed": {
                            "type": "boolean"
                          },
                          "identityReviewed": {
                            "type": "boolean"
                          },
                          "marketScopeReviewed": {
                            "type": "boolean"
                          },
                          "mediaRightsReviewed": {
                            "type": "boolean"
                          },
                          "ownerSafeCopyReviewed": {
                            "type": "boolean"
                          },
                          "surfaceInventoryReviewed": {
                            "type": "boolean"
                          }
                        }
                      },
                      "evidenceSummary": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "records",
                          "manualReportsWithoutArtifacts",
                          "unresolvedLocalRefs",
                          "missingSurfaceEvidence",
                          "rawProviderArtifactRefs",
                          "firestoreForbiddenArtifactRefs",
                          "riskFlags"
                        ],
                        "properties": {
                          "records": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "manualReportsWithoutArtifacts": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "unresolvedLocalRefs": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "missingSurfaceEvidence": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "rawProviderArtifactRefs": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "firestoreForbiddenArtifactRefs": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "riskFlags": {
                            "type": "array",
                            "maxItems": 12,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          }
                        }
                      },
                      "publicPresence": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "canonicalPath",
                          "claimTargetPath",
                          "publishStatus",
                          "indexStatus",
                          "appVisibility",
                          "projectionStatus"
                        ],
                        "properties": {
                          "canonicalPath": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "claimTargetPath": {
                            "anyOf": [
                              {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              {
                                "type": "null"
                              }
                            ]
                          },
                          "publishStatus": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          "indexStatus": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          "appVisibility": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          "projectionStatus": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          }
                        }
                      },
                      "adminDecision": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "allowedDecisions",
                          "defaultAppVisibility",
                          "currentDecision"
                        ],
                        "properties": {
                          "allowedDecisions": {
                            "type": "array",
                            "maxItems": 40,
                            "items": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            }
                          },
                          "defaultAppVisibility": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          "currentDecision": {
                            "anyOf": [
                              {
                                "type": "null"
                              },
                              {
                                "type": "object",
                                "additionalProperties": false,
                                "required": [
                                  "decision",
                                  "publishStatus",
                                  "indexStatus",
                                  "decidedAt",
                                  "appVisibility"
                                ],
                                "properties": {
                                  "decision": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  "publishStatus": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  "indexStatus": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  "decidedAt": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  "appVisibility": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  }
                                }
                              }
                            ]
                          }
                        }
                      },
                      "nextActions": {
                        "type": "array",
                        "maxItems": 12,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "supply_freshness_coverage"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "coverage"
                ],
                "properties": {
                  "recordType": {
                    "const": "supply_freshness_coverage"
                  },
                  "coverage": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "schemaVersion",
                      "recordType",
                      "coverageId",
                      "runId",
                      "kind",
                      "scopeKey",
                      "runKey",
                      "market",
                      "sourceProfileId",
                      "entityId",
                      "surfaceId",
                      "schedulerStatus",
                      "surfacePolicy",
                      "fetchEnabled",
                      "completedAt",
                      "policyVersion",
                      "requestHash"
                    ],
                    "properties": {
                      "schemaVersion": {
                        "type": "integer",
                        "const": 1
                      },
                      "recordType": {
                        "const": "supply_freshness_coverage"
                      },
                      "coverageId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "runId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 180,
                        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
                      },
                      "kind": {
                        "type": "string",
                        "enum": [
                          "city_discovery_sweep",
                          "candidate_verification",
                          "known_organizer_event_refresh",
                          "event_detail_prepublication"
                        ]
                      },
                      "scopeKey": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "runKey": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 500
                      },
                      "market": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 80
                      },
                      "sourceProfileId": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 160
                      },
                      "entityId": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 200
                      },
                      "surfaceId": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 200
                      },
                      "schedulerStatus": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 40
                      },
                      "surfacePolicy": {
                        "type": [
                          "string",
                          "null"
                        ],
                        "maxLength": 80
                      },
                      "fetchEnabled": {
                        "type": "boolean"
                      },
                      "completedAt": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "policyVersion": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 120
                      },
                      "requestHash": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "orphan_event_candidate"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "event"
          },
          "lifecycleStatus": {
            "not": {
              "const": "published"
            }
          },
          "blockerCodes": {
            "contains": {
              "const": "organizer_not_in_inventory"
            }
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "candidate"
                ],
                "properties": {
                  "recordType": {
                    "const": "orphan_event_candidate"
                  },
                  "candidate": {
                    "type": "object",
                    "additionalProperties": true,
                    "required": [
                      "id",
                      "candidateId",
                      "publicationEligibility",
                      "blockerCodes",
                      "attribution"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "candidateId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "publicationEligibility": {
                        "const": "blocked_orphan"
                      },
                      "blockerCodes": {
                        "type": "array",
                        "maxItems": 40,
                        "contains": {
                          "const": "organizer_not_in_inventory"
                        },
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "attribution": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "state",
                          "organizerEvidence",
                          "match"
                        ],
                        "properties": {
                          "state": {
                            "const": "orphan"
                          },
                          "organizerEvidence": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "name",
                              "url"
                            ],
                            "properties": {
                              "name": {
                                "anyOf": [
                                  {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  {
                                    "type": "null"
                                  }
                                ]
                              },
                              "url": {
                                "anyOf": [
                                  {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500
                                  },
                                  {
                                    "type": "null"
                                  }
                                ]
                              }
                            }
                          },
                          "match": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "decision",
                              "policyId",
                              "threshold",
                              "rationale",
                              "matchedEntityId",
                              "score",
                              "matchingSignals",
                              "blockingKeys"
                            ],
                            "properties": {
                              "decision": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              "policyId": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              "threshold": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "rationale": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 500
                              },
                              "matchedEntityId": {
                                "type": "null"
                              },
                              "score": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "matchingSignals": {
                                "type": "array",
                                "maxItems": 40,
                                "items": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                }
                              },
                              "blockingKeys": {
                                "type": "array",
                                "maxItems": 40,
                                "items": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 500
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_candidate"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "event"
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "candidate"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_candidate"
                  },
                  "candidate": {
                    "type": "object",
                    "additionalProperties": true,
                    "required": [
                      "id",
                      "title",
                      "startDate",
                      "sourceResultIds",
                      "reviewState",
                      "requiresVerification",
                      "warnings",
                      "blockerCodes",
                      "publicationEligibility"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "startDate": {
                        "type": "string",
                        "maxLength": 40
                      },
                      "sourceResultIds": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "reviewState": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "requiresVerification": {
                        "type": "boolean"
                      },
                      "warnings": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "blockerCodes": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "publicationEligibility": {
                        "const": "review_gated"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_source_result"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "source_result"
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "result"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_source_result"
                  },
                  "result": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "id",
                      "sourceProfileId",
                      "sourceLabel",
                      "queryTemplateId",
                      "resultType",
                      "title",
                      "url",
                      "snippet",
                      "observedAt",
                      "status",
                      "riskFlags",
                      "operatorNotes"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "sourceProfileId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "sourceLabel": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "queryTemplateId": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "resultType": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "url": {
                        "type": "string",
                        "maxLength": 2000
                      },
                      "snippet": {
                        "type": "string",
                        "maxLength": 1000
                      },
                      "observedAt": {
                        "type": "string",
                        "maxLength": 80
                      },
                      "status": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "riskFlags": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      },
                      "operatorNotes": {
                        "type": "string",
                        "maxLength": 1000
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "normalizedPayload": {
            "type": "object",
            "required": [
              "intake"
            ],
            "properties": {
              "intake": {
                "type": "object",
                "required": [
                  "recordType"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_source_profile"
                  }
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "entityKind": {
            "const": "source_profile"
          },
          "normalizedPayload": {
            "properties": {
              "intake": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "recordType",
                  "profile"
                ],
                "properties": {
                  "recordType": {
                    "const": "event_source_profile"
                  },
                  "profile": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "id",
                      "label",
                      "type",
                      "status",
                      "cadence",
                      "riskLevel",
                      "allowedUse",
                      "items"
                    ],
                    "properties": {
                      "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "label": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "type": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "status": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "cadence": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "riskLevel": {
                        "type": "string",
                        "enum": [
                          "low",
                          "medium",
                          "high"
                        ]
                      },
                      "allowedUse": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "items": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                          "type": "object",
                          "additionalProperties": false,
                          "required": [
                            "label",
                            "url"
                          ],
                          "properties": {
                            "label": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500
                            },
                            "url": {
                              "type": "string",
                              "maxLength": 2000
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ],
  "definitions": {
    "boundedString": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "boundedStringArray": {
      "type": "array",
      "maxItems": 40,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      }
    },
    "eventCandidateIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "candidate"
      ],
      "properties": {
        "recordType": {
          "const": "event_candidate"
        },
        "candidate": {
          "type": "object",
          "additionalProperties": true,
          "required": [
            "id",
            "title",
            "startDate",
            "sourceResultIds",
            "reviewState",
            "requiresVerification",
            "warnings",
            "blockerCodes",
            "publicationEligibility"
          ],
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "startDate": {
              "type": "string",
              "maxLength": 40
            },
            "sourceResultIds": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "reviewState": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "requiresVerification": {
              "type": "boolean"
            },
            "warnings": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "blockerCodes": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "publicationEligibility": {
              "const": "review_gated"
            }
          }
        }
      }
    },
    "eventSourceResultIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "result"
      ],
      "properties": {
        "recordType": {
          "const": "event_source_result"
        },
        "result": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "id",
            "sourceProfileId",
            "sourceLabel",
            "queryTemplateId",
            "resultType",
            "title",
            "url",
            "snippet",
            "observedAt",
            "status",
            "riskFlags",
            "operatorNotes"
          ],
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "sourceProfileId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "sourceLabel": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "queryTemplateId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "resultType": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "url": {
              "type": "string",
              "maxLength": 2000
            },
            "snippet": {
              "type": "string",
              "maxLength": 1000
            },
            "observedAt": {
              "type": "string",
              "maxLength": 80
            },
            "status": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "riskFlags": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "operatorNotes": {
              "type": "string",
              "maxLength": 1000
            }
          }
        }
      }
    },
    "eventSourceProfileIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "profile"
      ],
      "properties": {
        "recordType": {
          "const": "event_source_profile"
        },
        "profile": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "id",
            "label",
            "type",
            "status",
            "cadence",
            "riskLevel",
            "allowedUse",
            "items"
          ],
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "label": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "type": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "status": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "cadence": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "riskLevel": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "allowedUse": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "items": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "label",
                  "url"
                ],
                "properties": {
                  "label": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "url": {
                    "type": "string",
                    "maxLength": 2000
                  }
                }
              }
            }
          }
        }
      }
    },
    "organizerListingDraftIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "listing"
      ],
      "properties": {
        "recordType": {
          "const": "organizer_listing_draft"
        },
        "listing": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "listingId",
            "requestId",
            "kind",
            "submittedBy",
            "submittedAt",
            "seed",
            "organizer",
            "fieldEvidence",
            "eventCount",
            "pastEventCount",
            "pages",
            "gaps",
            "researchNeeded",
            "contentHash"
          ],
          "properties": {
            "listingId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "requestId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "kind": {
              "enum": [
                "nomination",
                "self_submission",
                "discovery"
              ]
            },
            "submittedBy": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "role",
                "uid",
                "partnerId"
              ],
              "properties": {
                "role": {
                  "enum": [
                    "associate",
                    "partner",
                    "organizer",
                    "system"
                  ]
                },
                "uid": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "partnerId": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              }
            },
            "submittedAt": {
              "type": "string",
              "minLength": 10,
              "maxLength": 40
            },
            "seed": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "name",
                "urls",
                "notes",
                "categories"
              ],
              "properties": {
                "name": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "urls": {
                  "type": "array",
                  "maxItems": 10,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  }
                },
                "notes": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 2000
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "categories": {
                  "type": "array",
                  "maxItems": 40,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                }
              }
            },
            "organizer": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "name",
                "description",
                "imageUrl",
                "locality",
                "categories",
                "links",
                "identityKeys"
              ],
              "properties": {
                "name": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "description": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 2000
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "imageUrl": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 2000
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "locality": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "categories": {
                  "type": "array",
                  "maxItems": 40,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                },
                "links": {
                  "type": "array",
                  "maxItems": 20,
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "platform",
                      "surfaceKind",
                      "url",
                      "normalizedKey",
                      "evidenceUrl"
                    ],
                    "properties": {
                      "platform": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "surfaceKind": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      "url": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      },
                      "normalizedKey": {
                        "anyOf": [
                          {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 500
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "evidenceUrl": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      }
                    }
                  }
                },
                "identityKeys": {
                  "type": "array",
                  "maxItems": 40,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                }
              }
            },
            "fieldEvidence": {
              "type": "array",
              "maxItems": 20,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "field",
                  "sourceUrl",
                  "method",
                  "adapterId"
                ],
                "properties": {
                  "field": {
                    "enum": [
                      "name",
                      "description",
                      "imageUrl",
                      "locality"
                    ]
                  },
                  "sourceUrl": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 2000
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "method": {
                    "enum": [
                      "adapter",
                      "nominator",
                      "agent"
                    ]
                  },
                  "adapterId": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                }
              }
            },
            "eventCount": {
              "type": "integer",
              "minimum": 0,
              "maximum": 60
            },
            "pastEventCount": {
              "type": "integer",
              "minimum": 0
            },
            "pages": {
              "type": "array",
              "maxItems": 12,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "url",
                  "via",
                  "platform",
                  "outcome",
                  "adapterId",
                  "pageKind",
                  "abstainReason",
                  "snapshotHash",
                  "capturedAt"
                ],
                "properties": {
                  "url": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  },
                  "via": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  },
                  "platform": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "outcome": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "adapterId": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "pageKind": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "abstainReason": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "snapshotHash": {
                    "anyOf": [
                      {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "capturedAt": {
                    "anyOf": [
                      {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 40
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                }
              }
            },
            "gaps": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "researchNeeded": {
              "type": "boolean"
            },
            "contentHash": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            }
          }
        }
      }
    },
    "listingEventCandidateIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "event"
      ],
      "properties": {
        "recordType": {
          "const": "listing_event_candidate"
        },
        "event": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "listingId",
            "listingWorkItemId",
            "requestId",
            "eventKey",
            "platform",
            "sourceEntityId",
            "title",
            "description",
            "startAt",
            "endAt",
            "timezone",
            "venue",
            "address",
            "locality",
            "latitude",
            "longitude",
            "sourceUrl",
            "imageUrl",
            "price",
            "status",
            "attendanceMode",
            "organizerName",
            "organizerUrl",
            "adapterId",
            "evidenceFields",
            "alsoListedAt"
          ],
          "properties": {
            "listingId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "listingWorkItemId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "requestId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "eventKey": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "platform": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "sourceEntityId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "title": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "description": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 2000
                },
                {
                  "type": "null"
                }
              ]
            },
            "startAt": {
              "type": "string",
              "minLength": 10,
              "maxLength": 40
            },
            "endAt": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 10,
                  "maxLength": 40
                },
                {
                  "type": "null"
                }
              ]
            },
            "timezone": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "venue": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "address": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "locality": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "latitude": {
              "anyOf": [
                {
                  "type": "number",
                  "minimum": -90,
                  "maximum": 90
                },
                {
                  "type": "null"
                }
              ]
            },
            "longitude": {
              "anyOf": [
                {
                  "type": "number",
                  "minimum": -180,
                  "maximum": 180
                },
                {
                  "type": "null"
                }
              ]
            },
            "sourceUrl": {
              "type": "string",
              "minLength": 1,
              "maxLength": 2000
            },
            "imageUrl": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 2000
                },
                {
                  "type": "null"
                }
              ]
            },
            "price": {
              "anyOf": [
                {
                  "type": "object",
                  "maxProperties": 8
                },
                {
                  "type": "null"
                }
              ]
            },
            "status": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "attendanceMode": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "organizerName": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "organizerUrl": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 2000
                },
                {
                  "type": "null"
                }
              ]
            },
            "adapterId": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                {
                  "type": "null"
                }
              ]
            },
            "evidenceFields": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "alsoListedAt": {
              "type": "array",
              "maxItems": 10,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2000
              }
            }
          }
        }
      }
    },
    "orphanEventCandidateIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "candidate"
      ],
      "properties": {
        "recordType": {
          "const": "orphan_event_candidate"
        },
        "candidate": {
          "type": "object",
          "additionalProperties": true,
          "required": [
            "id",
            "candidateId",
            "publicationEligibility",
            "blockerCodes",
            "attribution"
          ],
          "properties": {
            "id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "candidateId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "publicationEligibility": {
              "const": "blocked_orphan"
            },
            "blockerCodes": {
              "type": "array",
              "maxItems": 40,
              "contains": {
                "const": "organizer_not_in_inventory"
              },
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "attribution": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "state",
                "organizerEvidence",
                "match"
              ],
              "properties": {
                "state": {
                  "const": "orphan"
                },
                "organizerEvidence": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "name",
                    "url"
                  ],
                  "properties": {
                    "name": {
                      "anyOf": [
                        {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "url": {
                      "anyOf": [
                        {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        {
                          "type": "null"
                        }
                      ]
                    }
                  }
                },
                "match": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "decision",
                    "policyId",
                    "threshold",
                    "rationale",
                    "matchedEntityId",
                    "score",
                    "matchingSignals",
                    "blockingKeys"
                  ],
                  "properties": {
                    "decision": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    "policyId": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    "threshold": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "rationale": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    "matchedEntityId": {
                      "type": "null"
                    },
                    "score": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1
                    },
                    "matchingSignals": {
                      "type": "array",
                      "maxItems": 40,
                      "items": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      }
                    },
                    "blockingKeys": {
                      "type": "array",
                      "maxItems": 40,
                      "items": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "supplyFreshnessCoverageIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "coverage"
      ],
      "properties": {
        "recordType": {
          "const": "supply_freshness_coverage"
        },
        "coverage": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "schemaVersion",
            "recordType",
            "coverageId",
            "runId",
            "kind",
            "scopeKey",
            "runKey",
            "market",
            "sourceProfileId",
            "entityId",
            "surfaceId",
            "schedulerStatus",
            "surfacePolicy",
            "fetchEnabled",
            "completedAt",
            "policyVersion",
            "requestHash"
          ],
          "properties": {
            "schemaVersion": {
              "type": "integer",
              "const": 1
            },
            "recordType": {
              "const": "supply_freshness_coverage"
            },
            "coverageId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "runId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "kind": {
              "type": "string",
              "enum": [
                "city_discovery_sweep",
                "candidate_verification",
                "known_organizer_event_refresh",
                "event_detail_prepublication"
              ]
            },
            "scopeKey": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "runKey": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 500
            },
            "market": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 80
            },
            "sourceProfileId": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 160
            },
            "entityId": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 200
            },
            "surfaceId": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 200
            },
            "schedulerStatus": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 40
            },
            "surfacePolicy": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 80
            },
            "fetchEnabled": {
              "type": "boolean"
            },
            "completedAt": {
              "type": "string",
              "format": "date-time"
            },
            "policyVersion": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "requestHash": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            }
          }
        }
      }
    },
    "organizerPublicationPacketIntake": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "recordType",
        "packet"
      ],
      "properties": {
        "recordType": {
          "const": "organizer_publication_packet"
        },
        "packet": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "packetId",
            "entityId",
            "canonicalHostId",
            "displayName",
            "status",
            "priority",
            "markets",
            "blockers",
            "dataBlockers",
            "evidenceBlockers",
            "approvalChecklist",
            "evidenceSummary",
            "publicPresence",
            "adminDecision",
            "nextActions"
          ],
          "properties": {
            "packetId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "entityId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "canonicalHostId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "displayName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "status": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "priority": {
              "type": "string",
              "minLength": 1,
              "maxLength": 500
            },
            "markets": {
              "type": "array",
              "maxItems": 8,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "slug",
                  "displayName"
                ],
                "properties": {
                  "slug": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "displayName": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                }
              }
            },
            "blockers": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "dataBlockers": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "evidenceBlockers": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            },
            "approvalChecklist": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "crawlDisabledReviewed",
                "identityReviewed",
                "marketScopeReviewed",
                "mediaRightsReviewed",
                "ownerSafeCopyReviewed",
                "surfaceInventoryReviewed"
              ],
              "properties": {
                "crawlDisabledReviewed": {
                  "type": "boolean"
                },
                "identityReviewed": {
                  "type": "boolean"
                },
                "marketScopeReviewed": {
                  "type": "boolean"
                },
                "mediaRightsReviewed": {
                  "type": "boolean"
                },
                "ownerSafeCopyReviewed": {
                  "type": "boolean"
                },
                "surfaceInventoryReviewed": {
                  "type": "boolean"
                }
              }
            },
            "evidenceSummary": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "records",
                "manualReportsWithoutArtifacts",
                "unresolvedLocalRefs",
                "missingSurfaceEvidence",
                "rawProviderArtifactRefs",
                "firestoreForbiddenArtifactRefs",
                "riskFlags"
              ],
              "properties": {
                "records": {
                  "type": "integer",
                  "minimum": 0
                },
                "manualReportsWithoutArtifacts": {
                  "type": "integer",
                  "minimum": 0
                },
                "unresolvedLocalRefs": {
                  "type": "integer",
                  "minimum": 0
                },
                "missingSurfaceEvidence": {
                  "type": "integer",
                  "minimum": 0
                },
                "rawProviderArtifactRefs": {
                  "type": "integer",
                  "minimum": 0
                },
                "firestoreForbiddenArtifactRefs": {
                  "type": "integer",
                  "minimum": 0
                },
                "riskFlags": {
                  "type": "array",
                  "maxItems": 12,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                }
              }
            },
            "publicPresence": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "canonicalPath",
                "claimTargetPath",
                "publishStatus",
                "indexStatus",
                "appVisibility",
                "projectionStatus"
              ],
              "properties": {
                "canonicalPath": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "claimTargetPath": {
                  "anyOf": [
                    {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 500
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "publishStatus": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                "indexStatus": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                "appVisibility": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                "projectionStatus": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                }
              }
            },
            "adminDecision": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "allowedDecisions",
                "defaultAppVisibility",
                "currentDecision"
              ],
              "properties": {
                "allowedDecisions": {
                  "type": "array",
                  "maxItems": 40,
                  "items": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  }
                },
                "defaultAppVisibility": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 500
                },
                "currentDecision": {
                  "anyOf": [
                    {
                      "type": "null"
                    },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "decision",
                        "publishStatus",
                        "indexStatus",
                        "decidedAt",
                        "appVisibility"
                      ],
                      "properties": {
                        "decision": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        "publishStatus": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        "indexStatus": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        "decidedAt": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        },
                        "appVisibility": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 500
                        }
                      }
                    }
                  ]
                }
              }
            },
            "nextActions": {
              "type": "array",
              "maxItems": 12,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 500
              }
            }
          }
        }
      }
    }
  },
  "required": [
    "schemaVersion",
    "workItemId",
    "workflowId",
    "runId",
    "entityKind",
    "externalKey",
    "revision",
    "candidateHash",
    "primaryStage",
    "lifecycleStatus",
    "outcome",
    "taskFlags",
    "blockerCodes",
    "warningCodes",
    "priority",
    "attemptCount",
    "evidenceRefs",
    "fieldProvenance",
    "normalizedPayload",
    "decisionId",
    "publicationPlanId",
    "createdAt",
    "updatedAt",
    "staleAt",
    "expiresAt"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 1
    },
    "workItemId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "workflowId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120,
      "pattern": "^[a-z][a-z0-9_-]*$"
    },
    "runId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "entityKind": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    "externalKey": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 500
    },
    "revision": {
      "type": "integer",
      "minimum": 0
    },
    "candidateHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "primaryStage": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    "lifecycleStatus": {
      "type": "string",
      "enum": [
        "queued",
        "in_progress",
        "waiting",
        "ready",
        "published",
        "terminal"
      ]
    },
    "outcome": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 120,
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    "taskFlags": {
      "type": "array",
      "maxItems": 40,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120,
        "pattern": "^[a-z][a-z0-9_.:-]*$"
      }
    },
    "blockerCodes": {
      "type": "array",
      "maxItems": 40,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120,
        "pattern": "^[a-z][a-z0-9_.:-]*$"
      }
    },
    "warningCodes": {
      "type": "array",
      "maxItems": 40,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120,
        "pattern": "^[a-z][a-z0-9_.:-]*$"
      }
    },
    "priority": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000000
    },
    "attemptCount": {
      "type": "integer",
      "minimum": 0
    },
    "evidenceRefs": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "artifactId",
          "contentHash",
          "observedAt",
          "locator"
        ],
        "properties": {
          "artifactId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
          },
          "contentHash": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          },
          "observedAt": {
            "type": "string",
            "format": "date-time"
          },
          "locator": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 1000
          }
        }
      }
    },
    "fieldProvenance": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "field",
          "artifactId",
          "contentHash",
          "locator",
          "extractedBy",
          "extractorVersion",
          "confidence"
        ],
        "properties": {
          "field": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "artifactId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
          },
          "contentHash": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          },
          "locator": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 1000
          },
          "extractedBy": {
            "type": "string",
            "enum": [
              "deterministic",
              "model",
              "human"
            ]
          },
          "extractorVersion": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "confidence": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1
          }
        }
      }
    },
    "normalizedPayload": {
      "type": "object",
      "additionalProperties": true
    },
    "decisionId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
        },
        {
          "type": "null"
        }
      ]
    },
    "publicationPlanId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
        },
        {
          "type": "null"
        }
      ]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "staleAt": {
      "type": [
        "string",
        "null"
      ],
      "format": "date-time"
    },
    "expiresAt": {
      "type": [
        "string",
        "null"
      ],
      "format": "date-time"
    }
  }
} as const;
