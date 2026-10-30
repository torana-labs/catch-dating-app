/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const commercialTermsRevisionDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/commercial_terms_revisions.schema.json",
  "title": "CommercialTermsRevisionDocument",
  "description": "Immutable history of every commercial terms revision, keyed <termsId>_r<revision>. Created in the same transaction as the commercialTerms write it records and never updated.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "termsId",
    "scope",
    "organizerId",
    "revision",
    "terms",
    "reason",
    "actorUid",
    "createdAtMillis"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
      "x-catch-ownership": "callable-owned"
    },
    "termsId": {
      "type": "string",
      "pattern": "^(platform|org_[a-f0-9]{64})$",
      "x-catch-ownership": "callable-owned"
    },
    "scope": {
      "enum": [
        "platform",
        "organizer"
      ],
      "x-catch-ownership": "callable-owned"
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
      ],
      "x-catch-ownership": "callable-owned"
    },
    "revision": {
      "type": "integer",
      "minimum": 1,
      "x-catch-ownership": "callable-owned"
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
        }
      ],
      "x-catch-ownership": "callable-owned"
    },
    "reason": {
      "type": "string",
      "minLength": 3,
      "maxLength": 500,
      "x-catch-ownership": "callable-owned"
    },
    "actorUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "createdAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    }
  },
  "x-firestore-collection": "commercialTermsRevisions",
  "x-firestore-path": "commercialTermsRevisions/{revisionId}",
  "x-document-id-field": "revisionId",
  "x-owner": "manageCommercialTerms admin callable"
} as const;
