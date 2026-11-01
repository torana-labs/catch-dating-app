/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * The unbroken invoice number sequence for one Indian financial year (April to March), moneyInvoiceCounters/2026-27. lastNumber is the last number issued; the next bill sent takes lastNumber + 1, as 2026-27/032.
 */
export interface MoneyInvoiceCounterDocument {
  schemaVersion: 1;
  financialYear: string;
  lastNumber: number;
  updatedAtMillis: number;
}
