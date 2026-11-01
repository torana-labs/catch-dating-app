import {
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchPaneLayout,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {PeopleSearchController} from
  "../controllers/usePeopleSearchController";
import type {PersonRow} from "../api/peopleRepository";

interface PersonTableRow {
  key: string;
  person: {title: string; subtitle: string};
  city: string;
  account: {text: string; tone?: "danger"};
}

const columns: CatchTableColumn<PersonTableRow>[] = [
  {key: "person", label: "Person", kind: "title"},
  {key: "city", label: "City", width: "140px"},
  {key: "account", label: "Account", width: "120px"},
];

function tableRow(row: PersonRow): PersonTableRow {
  return {
    key: row.uid,
    person: {title: row.name ?? row.uid,
      subtitle: [row.uid, row.phone].filter(Boolean).join(" · ")},
    city: row.city ?? "—",
    account: row.deleted ? {text: "Deleted", tone: "danger"} :
      {text: "Active"},
  };
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <CatchIndexRow title={label} titleVariant="supporting"
      trailing={<CatchText as="span" variant="supportingStrong">{value}
      </CatchText>} />
  );
}

/**
 * People (board AdminPeople): search by name, phone or user id. Every
 * search is logged with the searcher's name, so it runs only when asked.
 * The person beside the results opens their account actions in Safety.
 */
export function PeopleScreen({
  onOpenSafety,
  search,
}: {
  onOpenSafety: (uid: string) => void;
  search: PeopleSearchController;
}) {
  const rows = search.rows.map(tableRow);
  const person = search.selected;
  return (
    <CatchPaneLayout
      detail={person ? (
        <>
          <CatchWorkspaceHeader kicker="People" title={person.name ??
            person.uid} />
          <CatchGap size="section">
            <CatchGap size="related">
              <Fact label="User id" value={person.uid} />
              <Fact label="Phone" value={person.phone ?? "Not given"} />
              <Fact label="City" value={person.city ?? "Not given"} />
              <Fact label="Account"
                value={person.deleted ? "Deleted" : "Active"} />
            </CatchGap>
            <CatchButton
              label="Account actions in Safety"
              onPressed={() => onOpenSafety(person.uid)}
              size="sm"
              variant="secondary"
            />
            <CatchText as="p" color="ink2" variant="bodyS">
              Searches and views are logged.
            </CatchText>
          </CatchGap>
        </>
      ) : undefined}
      detailOpen={person !== null}
      main={
        <>
          <CatchWorkspaceHeader
            actions={<CatchButton label="Search"
              onPressed={search.draft.trim() ? search.search : null}
              size="sm" />}
            count={search.result ? rows.length : undefined}
            filters={{search: {placeholder: "Name, phone or user id",
              value: search.draft, onChanged: search.setDraft}}}
            note="every search is logged with your name"
            title="People"
          />
          {search.loadState === "idle" ? (
            <CatchText as="p" color="ink2" variant="bodyM">
              Search by name, the last digits of a phone number, or a user
              id.
            </CatchText>
          ) : rows.length === 0 ? (
            <CatchText as="p" color="ink2" variant="bodyM">
              {search.loadState === "loading" ? "Searching" : "No one matches."}
            </CatchText>
          ) : (
            <CatchTable
              columns={columns}
              label="People"
              onRowPressed={(row) => search.select(row.key)}
              rows={rows}
              selectedKey={person?.uid ?? null}
            />
          )}
        </>
      }
      pattern="queue"
    />
  );
}
