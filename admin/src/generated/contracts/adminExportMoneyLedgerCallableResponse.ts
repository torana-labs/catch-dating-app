/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The month's ledger as CSV (Date, Type, Reference, Party, Description, Amount, GST, Status; amounts in rupees) with its file name and row count.
 */
export interface AdminExportMoneyLedgerCallableResponse {
  month: string;
  fileName: string;
  csv: string;
  rowCount: number;
}
