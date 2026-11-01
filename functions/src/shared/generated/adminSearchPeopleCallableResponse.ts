/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminSearchPeopleCallableResponse {
  kind: "uid" | "phone" | "name";
  /**
   * @maxItems 25
   */
  rows: {
    uid: string;
    name: string | null;
    phone: string | null;
    city: string | null;
    deleted: boolean;
  }[];
}
