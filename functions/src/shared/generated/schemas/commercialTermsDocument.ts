/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const commercialTermsDocumentSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/firestore/commercial_terms.schema.json",
  "title": "CommercialTermsDocument",
  "description": "Operator-owned commercial terms. The platform document holds complete defaults; an organizer document (id org_<sha256(organizerId)>) holds a sparse override. Every write bumps revision and appends an immutable commercialTermsRevisions record and an admin audit log in the same transaction. Direct client access is denied.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "scope",
    "organizerId",
    "revision",
    "terms",
    "reason",
    "updatedByUid",
    "updatedAtMillis",
    "lastMutationHash"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1,
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
    "updatedByUid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180,
      "x-catch-ownership": "callable-owned"
    },
    "updatedAtMillis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991,
      "x-catch-ownership": "callable-owned"
    },
    "lastMutationHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "x-catch-ownership": "callable-owned"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "scope": {
            "const": "platform"
          }
        }
      },
      "then": {
        "properties": {
          "organizerId": {
            "type": "null"
          },
          "terms": {
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
          }
        }
      },
      "else": {
        "properties": {
          "organizerId": {
            "type": "string"
          },
          "terms": {
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
        }
      }
    }
  ],
  "x-firestore-collection": "commercialTerms",
  "x-firestore-path": "commercialTerms/{termsId}",
  "x-document-id-field": "termsId",
  "x-owner": "manageCommercialTerms admin callable"
} as const;
