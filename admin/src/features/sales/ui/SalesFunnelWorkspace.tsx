import {CatchButton, CatchEmptyState, CatchGap, CatchSection, CatchTable, CatchText, type CatchTableColumn} from "@catch/web-ui";
import {dataMode} from "../../../shared/api/dataMode";
import {stageLabel} from "../controllers/salesLabels";
import {useSalesFunnelController} from "../controllers/useSalesFunnelController";

interface StageRow {
  key: string;
  stage: string;
  opportunities: string;
  hosts: string;
  entered: string;
}

const columns: CatchTableColumn<StageRow>[] = [
  {key: "stage", label: "Stage", kind: "title"},
  {key: "opportunities", label: "Deals now", width: "120px"},
  {key: "hosts", label: "Hosts now", width: "120px"},
  {key: "entered", label: "Hosts entering in the window", width: "220px"},
];

export function renderSalesFunnelWorkspace(actorUid: string) {
  return dataMode() === "sample" ?
    <CatchEmptyState title="Company pipeline" message="Company totals are available with live Sales records." /> :
    <SalesFunnelWorkspace key={actorUid} actorUid={actorUid} />;
}

function SalesFunnelWorkspace({actorUid}: {actorUid: string}) {
  const report = useSalesFunnelController(actorUid);
  const value = report.isSuccess ? report.data : null;
  return (
    <CatchSection title="Company pipeline" dividers="none">
      <CatchGap size="related">
        <CatchText as="p" variant="supporting">All active Sales hosts at one snapshot, including hosts on an outreach hold.
          Archived and privacy-restricted hosts are excluded.</CatchText>
        {report.isPending ? <CatchText as="p" variant="supporting">Loading company totals…</CatchText> : null}
        {report.isError ? <CatchEmptyState title="Company totals could not be verified" message="No partial totals are shown."
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void report.refetch()} />} /> : null}
        {value ? <>
          <CatchText as="p" variant="supporting">{value.activeHosts} hosts · {value.opportunities} opportunities across {value.hostsWithOpportunities} hosts.
        {" "}As of {new Date(value.asOf).toLocaleString()}.</CatchText>
          <CatchText as="p" variant="supporting">{value.overdueOpportunities} opportunities overdue · {value.opportunitiesMissingNextStep} missing a next step/date · {value.overdueObligations} overdue service, reply or review tasks.</CatchText>
                <CatchTable columns={columns} label="Company pipeline stages" rowKey="key" density="compact"
            rows={value.stages.map((row) => ({key: row.stage, stage: stageLabel(row.stage), opportunities: String(row.opportunities),
              hosts: String(row.distinctHosts), entered: String(row.distinctHostsEntered)}))} />
          <CatchText as="p" variant="supporting">A host can have several opportunities and appear in several stages.
        Stage entries since {new Date(value.since).toLocaleDateString()} describe recorded movement, including reopens; these are
        not conversion rates. Revenue is verified separately, under each deal's payment.</CatchText>
          <CatchText as="p" variant="supporting">{value.heldHosts} hosts on hold · {value.duplicateReviewHosts} identity reviews · {value.excludedArchivedOrRestrictedHosts} archived or restricted hosts excluded.</CatchText>
                <CatchButton label="Refresh totals" variant="secondary" size="sm" onPressed={report.isFetching ? null : () => void report.refetch()} />
        </> : null}
      </CatchGap>
    </CatchSection>
  );
}
