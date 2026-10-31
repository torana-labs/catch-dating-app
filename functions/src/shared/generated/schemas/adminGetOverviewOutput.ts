/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetOverviewCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_get_overview_response.schema.json",
  "title": "Admin Get Overview Callable Response",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "generatedAt",
    "timezone",
    "metrics",
    "queues",
    "dataQuality"
  ],
  "properties": {
    "generatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "timezone": {
      "const": "UTC"
    },
    "metrics": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "label",
          "value"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "value": {
            "type": "number"
          },
          "unit": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          }
        }
      }
    },
    "queues": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "safetyReports",
        "moderationFlags",
        "eventSafetyReports",
        "accessApplications",
        "organizerClaimRequests",
        "organizerIndexReviews",
        "paymentIssues"
      ],
      "properties": {
        "safetyReports": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "moderationFlags": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "eventSafetyReports": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "accessApplications": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "organizerClaimRequests": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "organizerIndexReviews": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        },
        "paymentIssues": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "detail",
              "status",
              "createdAt",
              "targetPath"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 180
              },
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 240
              },
              "detail": {
                "type": "string",
                "maxLength": 1000
              },
              "status": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "createdAt": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "date-time"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "targetPath": {
                "type": "string",
                "minLength": 3,
                "maxLength": 260
              }
            }
          }
        }
      }
    },
    "dataQuality": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "label",
          "state",
          "detail",
          "owner",
          "runbook",
          "nextAction"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "label": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "state": {
            "type": "string",
            "enum": [
              "ok",
              "warning",
              "blocked"
            ]
          },
          "detail": {
            "type": "string",
            "maxLength": 1000
          },
          "owner": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160
          },
          "runbook": {
            "type": "string",
            "minLength": 1,
            "maxLength": 260
          },
          "nextAction": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          }
        }
      }
    }
  },
  "definitions": {
    "metric": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "value"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "value": {
          "type": "number"
        },
        "unit": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        }
      }
    },
    "queue": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "detail",
          "status",
          "createdAt",
          "targetPath"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 240
          },
          "detail": {
            "type": "string",
            "maxLength": 1000
          },
          "status": {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          "createdAt": {
            "anyOf": [
              {
                "type": "string",
                "format": "date-time"
              },
              {
                "type": "null"
              }
            ]
          },
          "targetPath": {
            "type": "string",
            "minLength": 3,
            "maxLength": 260
          }
        }
      }
    },
    "queueItem": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "detail",
        "status",
        "createdAt",
        "targetPath"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 240
        },
        "detail": {
          "type": "string",
          "maxLength": 1000
        },
        "status": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "createdAt": {
          "anyOf": [
            {
              "type": "string",
              "format": "date-time"
            },
            {
              "type": "null"
            }
          ]
        },
        "targetPath": {
          "type": "string",
          "minLength": 3,
          "maxLength": 260
        }
      }
    },
    "dataQuality": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "state",
        "detail",
        "owner",
        "runbook",
        "nextAction"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1,
          "maxLength": 120
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "state": {
          "type": "string",
          "enum": [
            "ok",
            "warning",
            "blocked"
          ]
        },
        "detail": {
          "type": "string",
          "maxLength": 1000
        },
        "owner": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        },
        "runbook": {
          "type": "string",
          "minLength": 1,
          "maxLength": 260
        },
        "nextAction": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        }
      }
    }
  }
} as const;
