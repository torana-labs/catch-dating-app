/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const supplyIntakeRequestsDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/supply_intake_requests.schema.json",
  "title": "SupplyIntakeRequestDocument",
  "description": "One organizer intake request and its processing state. Front doors create it queued; the trusted Supply Intake worker leases it, gathers the seed pages, runs the workflow and records where the reviewable listing landed. Page snapshots live in the server-only artifact store; only their hashes and paths appear here.",
  "type": "object",
  "additionalProperties": false,
  "x-firestore-collection": "supplyIntakeRequests",
  "x-firestore-path": "supplyIntakeRequests/{requestId}",
  "x-document-id-field": "requestId",
  "x-owner": "trusted Supply Intake worker",
  "required": [
    "schemaVersion",
    "requestId",
    "request",
    "status",
    "attempts",
    "leaseUntil",
    "result",
    "failure",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "request": {
      "title": "SupplyIntakeRequest",
      "description": "One request to build an organizer listing and collect that organizer's events. Every front door (a sales associate or partner nomination, an organizer's own submission, or an Admin-started discovery run) creates one; Supply Intake gathers, reviews and stages the result for staff.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "schemaVersion",
        "requestId",
        "kind",
        "market",
        "seed",
        "submittedBy",
        "submittedAt",
        "origin"
      ],
      "properties": {
        "schemaVersion": {
          "type": "integer",
          "const": 1
        },
        "requestId": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$"
        },
        "kind": {
          "type": "string",
          "enum": [
            "nomination",
            "self_submission",
            "discovery"
          ]
        },
        "market": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{1,49}$"
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
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 160
            },
            "urls": {
              "type": "array",
              "maxItems": 10,
              "uniqueItems": true,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2000,
                "pattern": "^https?://"
              }
            },
            "notes": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 2000
            },
            "categories": {
              "type": "array",
              "maxItems": 8,
              "uniqueItems": true,
              "items": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,59}$"
              }
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "name": {
                    "type": "null"
                  }
                }
              },
              "then": {
                "properties": {
                  "urls": {
                    "minItems": 1
                  }
                }
              }
            }
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
              "type": "string",
              "enum": [
                "associate",
                "partner",
                "organizer",
                "system"
              ]
            },
            "uid": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 128
            },
            "partnerId": {
              "type": [
                "string",
                "null"
              ],
              "minLength": 1,
              "maxLength": 128
            }
          }
        },
        "submittedAt": {
          "type": "string",
          "format": "date-time"
        },
        "origin": {
          "description": "What created the request: an Admin nomination, a sales inbound intent (a website host application or a partner nomination), or a discovery run. Null for requests made by hand.",
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "kind",
                "id"
              ],
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": [
                    "admin_nomination",
                    "sales_inbound_intent",
                    "discovery_run"
                  ]
                },
                "id": {
                  "type": "string",
                  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$"
                }
              }
            }
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "kind": {
                "const": "discovery"
              }
            }
          },
          "then": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "role": {
                    "const": "system"
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "kind": {
                "const": "self_submission"
              }
            }
          },
          "then": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "role": {
                    "const": "organizer"
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "kind": {
                "const": "nomination"
              }
            }
          },
          "then": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "role": {
                    "enum": [
                      "associate",
                      "partner"
                    ]
                  },
                  "uid": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "role": {
                    "const": "partner"
                  }
                }
              }
            }
          },
          "then": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "partnerId": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "else": {
            "properties": {
              "submittedBy": {
                "properties": {
                  "partnerId": {
                    "type": "null"
                  }
                }
              }
            }
          }
        }
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "queued",
        "running",
        "completed",
        "failed"
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 3
    },
    "leaseUntil": {
      "type": [
        "string",
        "null"
      ],
      "format": "date-time"
    },
    "result": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "runId",
            "listingId",
            "listingWorkItemId",
            "eventWorkItemIds",
            "listingContentHash",
            "gaps",
            "researchNeeded",
            "eventCount",
            "stoppedReason",
            "artifactHash",
            "snapshotRefs",
            "captureReceipts"
          ],
          "properties": {
            "runId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "listingId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "listingWorkItemId": {
              "type": "string",
              "minLength": 1,
              "maxLength": 240,
              "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
            },
            "eventWorkItemIds": {
              "type": "array",
              "maxItems": 60,
              "items": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240,
                "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
              }
            },
            "listingContentHash": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            },
            "gaps": {
              "type": "array",
              "maxItems": 40,
              "items": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]{0,79}$"
              }
            },
            "researchNeeded": {
              "type": "boolean"
            },
            "eventCount": {
              "type": "integer",
              "minimum": 0,
              "maximum": 60
            },
            "stoppedReason": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 80
            },
            "artifactHash": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            },
            "snapshotRefs": {
              "type": "array",
              "maxItems": 12,
              "items": {
                "type": "string",
                "pattern": "^supply-intake/snapshots/[A-Za-z0-9._:-]{1,160}/[a-f0-9]{64}\\.json$"
              }
            },
            "captureReceipts": {
              "type": "array",
              "maxItems": 12,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "schemaVersion",
                  "runKey",
                  "adapterId",
                  "policyVersion",
                  "policyDecisionId",
                  "requestedUrl",
                  "finalUrl",
                  "outcome",
                  "status",
                  "contentType",
                  "capturedAt",
                  "snapshotHash",
                  "snapshotBytes",
                  "networkRequestsConsumed",
                  "budgetWindow",
                  "rawPayloadPersistence",
                  "firestorePersistenceAllowed"
                ],
                "properties": {
                  "schemaVersion": {
                    "const": 1
                  },
                  "runKey": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                  },
                  "adapterId": {
                    "enum": [
                      "page_fetch",
                      "static_page"
                    ]
                  },
                  "policyVersion": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                  },
                  "policyDecisionId": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 200
                  },
                  "requestedUrl": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                  },
                  "finalUrl": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 2000
                  },
                  "outcome": {
                    "type": "string",
                    "pattern": "^[a-z][a-z_]{0,59}$"
                  },
                  "status": {
                    "type": [
                      "integer",
                      "null"
                    ],
                    "minimum": 100,
                    "maximum": 599
                  },
                  "contentType": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "maxLength": 120
                  },
                  "capturedAt": {
                    "type": [
                      "string",
                      "null"
                    ],
                    "format": "date-time"
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
                  "snapshotBytes": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "networkRequestsConsumed": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 200
                  },
                  "budgetWindow": {
                    "anyOf": [
                      {
                        "type": "null"
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "monthKey",
                          "intakeConsumed",
                          "intakeLimit",
                          "monthConsumed",
                          "monthLimit"
                        ],
                        "properties": {
                          "monthKey": {
                            "type": "string",
                            "pattern": "^[0-9]{4}-[0-9]{2}$"
                          },
                          "intakeConsumed": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "intakeLimit": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "monthConsumed": {
                            "type": "integer",
                            "minimum": 0
                          },
                          "monthLimit": {
                            "type": "integer",
                            "minimum": 0
                          }
                        }
                      }
                    ]
                  },
                  "rawPayloadPersistence": {
                    "const": "external_artifact_store_only"
                  },
                  "firestorePersistenceAllowed": {
                    "const": false
                  }
                }
              }
            }
          }
        }
      ]
    },
    "failure": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "code",
            "message",
            "at",
            "attempts"
          ],
          "properties": {
            "code": {
              "type": "string",
              "pattern": "^[A-Za-z0-9_.-]{1,80}$"
            },
            "message": {
              "type": "string",
              "maxLength": 500
            },
            "at": {
              "type": "string",
              "format": "date-time"
            },
            "attempts": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3
            }
          }
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
    }
  },
  "definitions": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 240,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "hash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "captureReceipt": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "schemaVersion",
        "runKey",
        "adapterId",
        "policyVersion",
        "policyDecisionId",
        "requestedUrl",
        "finalUrl",
        "outcome",
        "status",
        "contentType",
        "capturedAt",
        "snapshotHash",
        "snapshotBytes",
        "networkRequestsConsumed",
        "budgetWindow",
        "rawPayloadPersistence",
        "firestorePersistenceAllowed"
      ],
      "properties": {
        "schemaVersion": {
          "const": 1
        },
        "runKey": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        },
        "adapterId": {
          "enum": [
            "page_fetch",
            "static_page"
          ]
        },
        "policyVersion": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "policyDecisionId": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "requestedUrl": {
          "type": "string",
          "minLength": 1,
          "maxLength": 2000
        },
        "finalUrl": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 2000
        },
        "outcome": {
          "type": "string",
          "pattern": "^[a-z][a-z_]{0,59}$"
        },
        "status": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 100,
          "maximum": 599
        },
        "contentType": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "capturedAt": {
          "type": [
            "string",
            "null"
          ],
          "format": "date-time"
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
        "snapshotBytes": {
          "type": "integer",
          "minimum": 0
        },
        "networkRequestsConsumed": {
          "type": "integer",
          "minimum": 0,
          "maximum": 200
        },
        "budgetWindow": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "monthKey",
                "intakeConsumed",
                "intakeLimit",
                "monthConsumed",
                "monthLimit"
              ],
              "properties": {
                "monthKey": {
                  "type": "string",
                  "pattern": "^[0-9]{4}-[0-9]{2}$"
                },
                "intakeConsumed": {
                  "type": "integer",
                  "minimum": 0
                },
                "intakeLimit": {
                  "type": "integer",
                  "minimum": 0
                },
                "monthConsumed": {
                  "type": "integer",
                  "minimum": 0
                },
                "monthLimit": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          ]
        },
        "rawPayloadPersistence": {
          "const": "external_artifact_store_only"
        },
        "firestorePersistenceAllowed": {
          "const": false
        }
      }
    }
  }
} as const;
