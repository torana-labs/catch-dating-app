/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminListCommercialTermsCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_list_commercial_terms_response.schema.json",
  "title": "AdminListCommercialTermsCallableResponse",
  "description": "Commercial terms as the Admin console reviews them. platform and organizer are the stored records (null when never saved); effectiveTerms merges them for the requested organizer, or is the platform terms for the platform scope (null while the platform is unconfigured). history holds the newest revisions of the requested scope. Lists are bounded and say when they are incomplete.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "termsId",
    "organizerId",
    "organizerName",
    "platform",
    "organizer",
    "effectiveTerms",
    "history",
    "historyComplete",
    "overrides",
    "overridesComplete",
    "organizerMatches"
  ],
  "definitions": {
    "millis": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "revision": {
      "type": "integer",
      "minimum": 1
    },
    "reason": {
      "type": "string",
      "minLength": 3,
      "maxLength": 500
    },
    "organizerName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "platformRecord": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "revision",
        "terms",
        "reason",
        "updatedByUid",
        "updatedAtMillis"
      ],
      "properties": {
        "revision": {
          "type": "integer",
          "minimum": 1
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
        },
        "reason": {
          "type": "string",
          "minLength": 3,
          "maxLength": 500
        },
        "updatedByUid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "updatedAtMillis": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      }
    },
    "organizerRecord": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "revision",
        "terms",
        "reason",
        "updatedByUid",
        "updatedAtMillis"
      ],
      "properties": {
        "revision": {
          "type": "integer",
          "minimum": 1
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
        },
        "reason": {
          "type": "string",
          "minLength": 3,
          "maxLength": 500
        },
        "updatedByUid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 180
        },
        "updatedAtMillis": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        }
      }
    }
  },
  "properties": {
    "termsId": {
      "type": "string",
      "pattern": "^(platform|org_[a-f0-9]{64})$"
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
    "organizerName": {
      "type": [
        "string",
        "null"
      ],
      "maxLength": 200
    },
    "platform": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "revision",
            "terms",
            "reason",
            "updatedByUid",
            "updatedAtMillis"
          ],
          "properties": {
            "revision": {
              "type": "integer",
              "minimum": 1
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
            },
            "reason": {
              "type": "string",
              "minLength": 3,
              "maxLength": 500
            },
            "updatedByUid": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "updatedAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "organizer": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "revision",
            "terms",
            "reason",
            "updatedByUid",
            "updatedAtMillis"
          ],
          "properties": {
            "revision": {
              "type": "integer",
              "minimum": 1
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
            },
            "reason": {
              "type": "string",
              "minLength": 3,
              "maxLength": 500
            },
            "updatedByUid": {
              "type": "string",
              "minLength": 1,
              "maxLength": 180
            },
            "updatedAtMillis": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        },
        {
          "type": "null"
        }
      ]
    },
    "effectiveTerms": {
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
          "type": "null"
        }
      ]
    },
    "history": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "revision",
          "terms",
          "reason",
          "actorUid",
          "createdAtMillis"
        ],
        "properties": {
          "revision": {
            "type": "integer",
            "minimum": 1
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
            ]
          },
          "reason": {
            "type": "string",
            "minLength": 3,
            "maxLength": 500
          },
          "actorUid": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "createdAtMillis": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          }
        }
      }
    },
    "historyComplete": {
      "type": "boolean"
    },
    "overrides": {
      "type": "array",
      "maxItems": 100,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "organizerName",
          "revision",
          "terms",
          "reason",
          "updatedAtMillis"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "organizerName": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 200
          },
          "revision": {
            "type": "integer",
            "minimum": 1
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
          },
          "reason": {
            "type": "string",
            "minLength": 3,
            "maxLength": 500
          },
          "updatedAtMillis": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          }
        }
      }
    },
    "overridesComplete": {
      "type": "boolean"
    },
    "organizerMatches": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "organizerName",
          "cityName"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 180
          },
          "organizerName": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 200
          },
          "cityName": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 200
          }
        }
      }
    }
  }
} as const;
