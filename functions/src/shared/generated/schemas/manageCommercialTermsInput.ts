/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const manageCommercialTermsCallablePayloadSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callables/manage_commercial_terms_payload.schema.json",
  "title": "ManageCommercialTermsCallablePayload",
  "description": "Finance/Admin Owner read or full replacement of the platform commercial terms (organizerId null) or one organizer's sparse override. A write names the revision it reviewed and a reason for the audit trail.",
  "type": "object",
  "additionalProperties": false,
  "x-owner": "Catch operators (Finance, Admin Owner)",
  "required": [
    "action",
    "organizerId",
    "expectedRevision",
    "terms",
    "reason"
  ],
  "properties": {
    "action": {
      "enum": [
        "read",
        "replace"
      ]
    },
    "organizerId": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        {
          "type": "null"
        }
      ]
    },
    "expectedRevision": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "terms": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "currency",
            "commission",
            "trial",
            "toolsOnly",
            "gatewayFeeBearer",
            "purposes"
          ],
          "properties": {
            "currency": {
              "const": "INR"
            },
            "commission": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "rateBasisPoints",
                "capMinor",
                "cycleDays",
                "cycleAnchor",
                "base",
                "taxTreatment"
              ],
              "properties": {
                "rateBasisPoints": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 10000
                },
                "capMinor": {
                  "description": "Cap per cycle in minor units; null means uncapped.",
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 100000000000
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "cycleDays": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 366
                },
                "cycleAnchor": {
                  "enum": [
                    "trialEnd"
                  ]
                },
                "base": {
                  "enum": [
                    "netOfRefunds",
                    "gross"
                  ]
                },
                "taxTreatment": {
                  "description": "exclusive: amounts are before GST, which is added on top.",
                  "enum": [
                    "exclusive",
                    "inclusive"
                  ]
                }
              }
            },
            "trial": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "days",
                "anchor"
              ],
              "properties": {
                "days": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 366
                },
                "anchor": {
                  "enum": [
                    "firstEvent"
                  ]
                }
              }
            },
            "toolsOnly": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "feeMinor"
              ],
              "properties": {
                "feeMinor": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 100000000000,
                  "description": "Flat tools-only fee per commission cycle, in minor units, on the same tax treatment as the commission."
                }
              }
            },
            "gatewayFeeBearer": {
              "enum": [
                "host",
                "platform"
              ]
            },
            "purposes": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "eventAdmission",
                "formFee",
                "hostMembership"
              ],
              "properties": {
                "eventAdmission": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "countsTowardCommission",
                    "atSourceFeeBasisPoints"
                  ],
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999,
                      "description": "Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit."
                    }
                  }
                },
                "formFee": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "countsTowardCommission",
                    "atSourceFeeBasisPoints"
                  ],
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999,
                      "description": "Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit."
                    }
                  }
                },
                "hostMembership": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "countsTowardCommission",
                    "atSourceFeeBasisPoints"
                  ],
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999,
                      "description": "Fee deducted from each payment before the organizer's transfer. Applies only when the purpose's money flow is platformSplit."
                    }
                  }
                }
              }
            }
          }
        },
        {
          "description": "Sparse organizer override. Every key is optional and an absent key inherits the platform default; commission.capMinor may be set to null to remove the cap.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "commission": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "rateBasisPoints": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 10000
                },
                "capMinor": {
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 100000000000
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "cycleDays": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 366
                },
                "cycleAnchor": {
                  "enum": [
                    "trialEnd"
                  ]
                },
                "base": {
                  "enum": [
                    "netOfRefunds",
                    "gross"
                  ]
                },
                "taxTreatment": {
                  "enum": [
                    "exclusive",
                    "inclusive"
                  ]
                }
              }
            },
            "trial": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "days": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 366
                },
                "anchor": {
                  "enum": [
                    "firstEvent"
                  ]
                }
              }
            },
            "toolsOnly": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "feeMinor": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 100000000000
                }
              }
            },
            "gatewayFeeBearer": {
              "enum": [
                "host",
                "platform"
              ]
            },
            "purposes": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "eventAdmission": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999
                    }
                  }
                },
                "formFee": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999
                    }
                  }
                },
                "hostMembership": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "countsTowardCommission": {
                      "type": "boolean"
                    },
                    "atSourceFeeBasisPoints": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9999
                    }
                  }
                }
              }
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "reason": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 3,
      "maxLength": 500
    }
  }
} as const;
