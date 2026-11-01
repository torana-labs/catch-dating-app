/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminGetGrowthCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_get_growth_response.schema.json",
  "title": "AdminGetGrowthCallableResponse",
  "description": "Growth for one range, computed from organizerGrowthFacts, organizer bills, nominator credit and costs. Cohorts group organizers by the India-time month they were listed; days are medians counted from listing. Ticket sales are what organizers sold into their own accounts, from their monthly bills. Catch earned is what organizers' bills came to (paid or not, excluding free months).",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "range",
    "generatedAtMillis",
    "summary",
    "cohorts",
    "claimDays",
    "salesByMonthOnCatch",
    "channels",
    "claimsByMonth",
    "adSpend",
    "nominators",
    "best"
  ],
  "definitions": {
    "channel": {
      "type": "string",
      "description": "Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.",
      "enum": [
        "imported",
        "sales_associate",
        "partner",
        "guest",
        "organizer",
        "came_to_us",
        "ads"
      ]
    },
    "month": {
      "type": "string",
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "count": {
      "type": "integer",
      "minimum": 0
    },
    "minor": {
      "type": "integer",
      "minimum": 0
    },
    "days": {
      "type": [
        "number",
        "null"
      ],
      "minimum": 0
    }
  },
  "properties": {
    "range": {
      "enum": [
        "90d",
        "12m",
        "all"
      ]
    },
    "generatedAtMillis": {
      "type": "integer",
      "minimum": 1
    },
    "summary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "listed",
        "claimed",
        "claimMedianDays",
        "ranEvent",
        "ranEventMedianDays",
        "paying",
        "sinceMonth"
      ],
      "properties": {
        "listed": {
          "type": "integer",
          "minimum": 0
        },
        "claimed": {
          "type": "integer",
          "minimum": 0
        },
        "claimMedianDays": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0
        },
        "ranEvent": {
          "type": "integer",
          "minimum": 0
        },
        "ranEventMedianDays": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0
        },
        "paying": {
          "type": "integer",
          "minimum": 0
        },
        "sinceMonth": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "cohorts": {
      "type": "array",
      "maxItems": 120,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "month",
          "listed",
          "claimed",
          "claimMedianDays",
          "ranEvent",
          "ranEventMedianDays",
          "tooEarly"
        ],
        "properties": {
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "listed": {
            "type": "integer",
            "minimum": 0
          },
          "claimed": {
            "type": "integer",
            "minimum": 0
          },
          "claimMedianDays": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0
          },
          "ranEvent": {
            "type": "integer",
            "minimum": 0
          },
          "ranEventMedianDays": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0
          },
          "tooEarly": {
            "type": "boolean",
            "description": "Listed under 30 days ago, so most of its organizers have not had time to run an event."
          }
        }
      }
    },
    "claimDays": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "label",
          "count"
        ],
        "properties": {
          "label": {
            "enum": [
              "0–3",
              "4–7",
              "8–14",
              "15–30",
              "31+"
            ]
          },
          "count": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "salesByMonthOnCatch": {
      "type": "array",
      "maxItems": 120,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "month",
          "organizers",
          "salesPerOrganizerMinor"
        ],
        "properties": {
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "organizers": {
            "type": "integer",
            "minimum": 0
          },
          "salesPerOrganizerMinor": {
            "type": "array",
            "maxItems": 6,
            "items": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 0
            },
            "description": "Average ticket sales per organizer in their 1st to 6th month on Catch, counted from the month of their first event; null where the month has not come yet."
          }
        }
      }
    },
    "channels": {
      "type": "array",
      "maxItems": 7,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "channel",
          "listed",
          "claimed",
          "paying",
          "earnedMinor",
          "costMinor",
          "costKind",
          "detail"
        ],
        "properties": {
          "channel": {
            "type": "string",
            "description": "Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.",
            "enum": [
              "imported",
              "sales_associate",
              "partner",
              "guest",
              "organizer",
              "came_to_us",
              "ads"
            ]
          },
          "listed": {
            "type": "integer",
            "minimum": 0
          },
          "claimed": {
            "type": "integer",
            "minimum": 0
          },
          "paying": {
            "type": "integer",
            "minimum": 0
          },
          "earnedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "costMinor": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "costKind": {
            "enum": [
              "ads",
              "credit",
              "salaries",
              "none"
            ]
          },
          "detail": {
            "type": "string",
            "maxLength": 120
          }
        }
      }
    },
    "claimsByMonth": {
      "type": "array",
      "maxItems": 120,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "month",
          "count"
        ],
        "properties": {
          "month": {
            "type": "string",
            "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
          },
          "count": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "adSpend": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "month",
        "metaMinor",
        "metaConnected",
        "googleConnected",
        "adClaims"
      ],
      "properties": {
        "month": {
          "type": "string",
          "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
        },
        "metaMinor": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "metaConnected": {
          "type": "boolean"
        },
        "googleConnected": {
          "type": "boolean"
        },
        "adClaims": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "nominators": {
      "type": "array",
      "maxItems": 1000,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "uid",
          "name",
          "role",
          "nominated",
          "claimed",
          "paying",
          "paidToCatchMinor",
          "creditOwedMinor",
          "creditApprovedMinor",
          "creditPaidMinor",
          "firstNominatedAtMillis",
          "organizers"
        ],
        "properties": {
          "uid": {
            "type": "string",
            "maxLength": 128
          },
          "name": {
            "type": "string",
            "maxLength": 120
          },
          "role": {
            "enum": [
              "associate",
              "partner",
              "guest",
              "organizer"
            ]
          },
          "nominated": {
            "type": "integer",
            "minimum": 0
          },
          "claimed": {
            "type": "integer",
            "minimum": 0
          },
          "paying": {
            "type": "integer",
            "minimum": 0
          },
          "paidToCatchMinor": {
            "type": "integer",
            "minimum": 0
          },
          "creditOwedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "creditApprovedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "creditPaidMinor": {
            "type": "integer",
            "minimum": 0
          },
          "firstNominatedAtMillis": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "organizers": {
            "type": "array",
            "maxItems": 50,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "organizerId",
                "name",
                "claimed",
                "latestBill",
                "creditMonthIndex"
              ],
              "properties": {
                "organizerId": {
                  "type": "string",
                  "maxLength": 180
                },
                "name": {
                  "type": "string",
                  "maxLength": 160
                },
                "claimed": {
                  "type": "boolean"
                },
                "latestBill": {
                  "anyOf": [
                    {
                      "type": "null"
                    },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "billId",
                        "month",
                        "totalMinor",
                        "status",
                        "creditMinor"
                      ],
                      "properties": {
                        "billId": {
                          "type": "string",
                          "maxLength": 200
                        },
                        "month": {
                          "type": "string",
                          "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
                        },
                        "totalMinor": {
                          "type": "integer",
                          "minimum": 0
                        },
                        "status": {
                          "description": "toSend: made, not sent. sent: sent with its invoice number and due date; overdue is sent past its due date. paid, writtenOff: closed. free: nothing due because every sale fell in the free trial.",
                          "enum": [
                            "toSend",
                            "sent",
                            "paid",
                            "writtenOff",
                            "free"
                          ]
                        },
                        "creditMinor": {
                          "type": [
                            "integer",
                            "null"
                          ],
                          "minimum": 0
                        }
                      }
                    }
                  ]
                },
                "creditMonthIndex": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1
                }
              }
            }
          }
        }
      }
    },
    "best": {
      "type": "array",
      "maxItems": 200,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "organizerId",
          "name",
          "marketId",
          "salesMinor",
          "earnedMinor",
          "events",
          "trendPercent",
          "channel",
          "payingSinceMonth",
          "inTrial",
          "ownTerms"
        ],
        "properties": {
          "organizerId": {
            "type": "string",
            "maxLength": 180
          },
          "name": {
            "type": "string",
            "maxLength": 160
          },
          "marketId": {
            "type": [
              "string",
              "null"
            ],
            "maxLength": 50
          },
          "salesMinor": {
            "type": "integer",
            "minimum": 0
          },
          "earnedMinor": {
            "type": "integer",
            "minimum": 0
          },
          "events": {
            "type": "integer",
            "minimum": 0
          },
          "trendPercent": {
            "type": [
              "integer",
              "null"
            ],
            "description": "Ticket sales in the last three billed months against the three before; null when there is nothing to compare."
          },
          "channel": {
            "type": "string",
            "description": "Where the organizer first came from. imported: Catch found it (discovery or an import). sales_associate: a Catch sales associate nominated it. partner, guest, organizer: someone outside Catch nominated it. came_to_us: the organizer applied or set itself up. ads: the organizer applied after a paid campaign.",
            "enum": [
              "imported",
              "sales_associate",
              "partner",
              "guest",
              "organizer",
              "came_to_us",
              "ads"
            ]
          },
          "payingSinceMonth": {
            "anyOf": [
              {
                "type": "string",
                "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
              },
              {
                "type": "null"
              }
            ]
          },
          "inTrial": {
            "type": "boolean"
          },
          "ownTerms": {
            "type": "boolean"
          }
        }
      }
    }
  }
} as const;
