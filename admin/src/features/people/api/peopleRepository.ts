import {searchPeople} from "../../../shared/api/adminApi";
import type {AdminSearchPeopleCallableResponse} from
  "../../../generated/contracts/adminSearchPeopleCallableResponse";

export type PeopleSearchResult = AdminSearchPeopleCallableResponse;
export type PersonRow = PeopleSearchResult["rows"][number];

/** Search by name, phone or user id. The server logs every search. */
export function findPeople(query: string): Promise<PeopleSearchResult> {
  return searchPeople({query, limit: 25});
}
