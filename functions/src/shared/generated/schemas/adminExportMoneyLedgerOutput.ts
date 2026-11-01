/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const adminExportMoneyLedgerCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/admin_export_money_ledger_response.schema.json",
  "title": "AdminExportMoneyLedgerCallableResponse",
  "description": "The month's ledger as CSV (Date, Type, Reference, Party, Description, Amount, GST, Status; amounts in rupees) with its file name and row count.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "month",
    "fileName",
    "csv",
    "rowCount"
  ],
  "properties": {
    "month": {
      "type": "string",
      "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])$"
    },
    "fileName": {
      "type": "string",
      "pattern": "^catch-ledger-[0-9]{4}-[0-9]{2}\\.csv$"
    },
    "csv": {
      "type": "string",
      "maxLength": 5000000
    },
    "rowCount": {
      "type": "integer",
      "minimum": 0
    }
  }
} as const;
